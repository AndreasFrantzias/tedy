import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';


/** 
* One-time script: imports part of the event dataset (events, bookings, views)
 * so the recommender has real data to learn from.
 *
 * The dataset has no titles or categories, so those are generated.
 * Events that people booked or viewed are imported first.
*/

// How many events to import (override with IMPORT_MAX_EVENTS in .env)
const MAX_EVENTS = Number(process.env.IMPORT_MAX_EVENTS ?? 600);
// CSV folder sits next to backend/ (script is run from inside backend/)
const DATASET_DIR = path.join(process.cwd(), '..', 'rel_event_csvs');

// The dataset has no real categories, so each event's strongest cluster is mapped onto one of these
const CATEGORY_NAMES = [
  'Music',
  'Sports',
  'Arts',
  'Technology',
  'Business',
  'Education',
  'Food & Drink',
  'Health',
  'Community',
  'Family',
  'Charity',
  'Outdoors',
];

// Standalone script (not part of the Nest app), so it creates its own Prisma client
// with the same connection settings as PrismaService.
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// dataset user id -> our DB user id, so each user is only looked up / created once
const userIdCache = new Map<string, number>();
// All imported users share one password; hashed once in main() because bcrypt is slow
let sharedPasswordHash: string;

// Returns the DB id for a dataset user, creating a "ds_<id>" account the first time it's seen
async function getOrCreateDatasetUser(datasetUserId: string): Promise<number> {
  const cached = userIdCache.get(datasetUserId);
  if (cached !== undefined) {
    return cached;
  }
  const username = `ds_${datasetUserId}`;
  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      email: `${username}@dataset.local`,
      passwordHash: sharedPasswordHash,
      roles: ['user'],
      active: true,
      status: 'APPROVED',
    },
  });
  userIdCache.set(datasetUserId, user.id);
  return user.id;
}

// Plain comma split: fine for this dataset, which has no quoted fields containing commas
function splitCsvLine(line: string): string[] {
  return line.split(',');
}

// Streams line by line instead of loading the whole file, since the CSVs are large
async function* readCsvRows(filePath: string): AsyncGenerator<string[]> {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    yield splitCsvLine(line);
  }
}

// One parsed row of events.csv
interface RawEventRow {
  eventId: string; // dataset's event id (not our DB id)
  organizerUserId: string;
  startDate: Date;
  city: string;
  country: string;
  lat: number;
  lng: number;
  clusters: number[]; // c_1..c_100 word-count columns, used to pick a category
}

// Step 1: collect ids of events that have at least one "yes" attendee or one interest record
async function collectInteractionEventIds(): Promise<Set<string>> {
  const ids = new Set<string>();

  const attendeesPath = path.join(DATASET_DIR, 'event_attendees.csv');
  for await (const cols of readCsvRows(attendeesPath)) {
    const [, eventId, status] = cols;
    if (status === 'yes' && eventId) {
      ids.add(eventId);
    }
  }

  const interestPath = path.join(DATASET_DIR, 'event_interest.csv');
  for await (const cols of readCsvRows(interestPath)) {
    const [, eventId] = cols;
    if (eventId) {
      ids.add(eventId);
    }
  }

  return ids;
}

// Step 2: pick up to MAX_EVENTS rows from events.csv, preferring events that have interactions
async function selectEventRows(
  interactionIds: Set<string>,
): Promise<RawEventRow[]> {
  const filePath = path.join(DATASET_DIR, 'events.csv');

  const priorityRows: RawEventRow[] = []; // events with bookings/views
  const fillerRows: RawEventRow[] = []; // other events, used only to fill up to MAX_EVENTS

  for await (const cols of readCsvRows(filePath)) {
    // Stop reading early once both lists are full (events.csv is very large)
    if (
      priorityRows.length >= interactionIds.size &&
      fillerRows.length >= MAX_EVENTS
    ) {
      break;
    }

    //empty slots skip the state and zip columns
    const [eventId, organizerUserId, startTime, city, , , country, lat, lng] =
      cols;
    // Skip rows with no location or an unparseable start date
    if (!eventId || !lat || !lng) {
      continue;
    }
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      continue;
    }

    const row: RawEventRow = {
      eventId,
      organizerUserId,
      startDate,
      city: city || 'Unknown City',
      country: country || 'Unknown',
      lat: Number(lat),
      lng: Number(lng),
      // Columns 9..108 are c_1..c_100; blanks become 0
      clusters: cols.slice(9, 109).map((v) => Number(v) || 0),
    };

    if (interactionIds.has(eventId)) {
      priorityRows.push(row);
    } else if (fillerRows.length < MAX_EVENTS) {
      fillerRows.push(row);
    }
  }

  // Priority events first, then filler, capped at MAX_EVENTS total
  return [...priorityRows.slice(0, MAX_EVENTS), ...fillerRows].slice(
    0,
    MAX_EVENTS,
  );
}

//what we remember about each created event, so bookings/views can link to it
interface ImportedEvent {
  dbId: number;
  ticketTypeDbId: number;
  price: number;
}

// Step 3: create the selected events in the DB.
// Returns a map of dataset event id -> ImportedEvent.
async function importEvents(
  rows: RawEventRow[],
): Promise<Map<string, ImportedEvent>> {
  const selected = new Map<string, ImportedEvent>();

  for (const row of rows) {
    // Find the cluster with the highest count and turn it into a category name
    let maxIndex = 0;
    for (let i = 1; i < row.clusters.length; i++) {
      if (row.clusters[i] > row.clusters[maxIndex]) {
        maxIndex = i;
      }
    }
    const category = CATEGORY_NAMES[maxIndex % CATEGORY_NAMES.length];

    // Rows without an organizer all share one fallback organizer account
    const organizerId = row.organizerUserId
      ? await getOrCreateDatasetUser(row.organizerUserId)
      : await getOrCreateDatasetUser('fallback-organizer');

    // The dataset has no capacity, price or end time, so make up plausible values
    const capacity = 50 + Math.floor(Math.random() * 250); // 50..299
    const price = Math.round((5 + Math.random() * 45) * 100) / 100; // 5.00..50.00
    const endDate = new Date(row.startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    // Create the event with a placeholder eventId, then set it to "EV<db id>".
    // The public id depends on the auto-increment id, which only exists after insert.
    // Wrapped in a transaction so an event is never left with "PENDING".
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          eventId: 'PENDING',
          title: `${category} Event in ${row.city}`,
          eventType: category,
          venue: `${row.city} Community Venue`,
          address: `${row.city} Main Street`,
          city: row.city,
          country: row.country,
          lat: row.lat,
          lng: row.lng,
          startDateTime: row.startDate,
          endDateTime: endDate,
          capacity,
          description: `An imported community ${category.toLowerCase()} event in ${row.city}, ${row.country}.`,
          status: 'PUBLISHED',
          organizerId,
          // Reuse the category row if it exists, otherwise create it
          categories: {
            connectOrCreate: {
              where: { name: category },
              create: { name: category },
            },
          },
          // Every imported event gets a single ticket type
          ticketTypes: {
            create: {
              ticketTypeId: 'T1',
              name: 'General Admission',
              price,
              quantity: capacity,
              available: capacity,
            },
          },
        },
        include: { ticketTypes: true },
      });
      return tx.event.update({
        where: { id: created.id },
        data: { eventId: `EV${created.id}` },
        include: { ticketTypes: true },
      });
    });

    selected.set(row.eventId, {
      dbId: event.id,
      ticketTypeDbId: event.ticketTypes[0].id,
      price,
    });
  }

  return selected;
}

// Step 4: turn every "yes" attendee row into a confirmed 1-ticket booking
async function importBookings(
  events: Map<string, ImportedEvent>,
): Promise<void> {
  const filePath = path.join(DATASET_DIR, 'event_attendees.csv');
  let bookingCount = 0;

  for await (const cols of readCsvRows(filePath)) {
    const [, eventId, status, userId] = cols;
    if (status !== 'yes' || !userId) {
      continue;
    }
    // Skip attendees of events we didn't import
    const imported = events.get(eventId);
    if (!imported) {
      continue;
    }

    const attendeeId = await getOrCreateDatasetUser(userId);

    const booking = await prisma.$transaction(async (tx) => {
      // Take one ticket only if one is still available; count 0 means sold out, so skip
      const decremented = await tx.ticketType.updateMany({
        where: { id: imported.ticketTypeDbId, available: { gte: 1 } },
        data: { available: { decrement: 1 } },
      });
      if (decremented.count === 0) {
        return null;
      }
      // Same placeholder-then-update trick as events: bookingId becomes "B<db id>"
      const created = await tx.booking.create({
        data: {
          bookingId: 'PENDING',
          eventId: imported.dbId,
          attendeeId,
          ticketTypeId: imported.ticketTypeDbId,
          numberOfTickets: 1,
          totalCost: imported.price,
          status: 'CONFIRMED',
        },
      });
      return tx.booking.update({
        where: { id: created.id },
        data: { bookingId: `B${created.id}` },
      });
    });

    if (booking) {
      bookingCount++;
    }
  }

  console.log(`Imported ${bookingCount} bookings.`);
}

// Step 5: turn every interest row into an event view (the recommender uses views as signals)
async function importViews(events: Map<string, ImportedEvent>): Promise<void> {
  const filePath = path.join(DATASET_DIR, 'event_interest.csv');
  let viewCount = 0;

  for await (const cols of readCsvRows(filePath)) {
    const [userId, eventId, , timestamp] = cols;
    const imported = events.get(eventId);
    if (!imported || !userId) {
      continue;
    }

    const viewedAt = new Date(timestamp);
    const userDbId = await getOrCreateDatasetUser(userId);

    await prisma.eventView.create({
      data: {
        userId: userDbId,
        eventId: imported.dbId,
        // Fall back to "now" if the dataset timestamp can't be parsed
        viewedAt: isNaN(viewedAt.getTime()) ? new Date() : viewedAt,
      },
    });
    viewCount++;
  }

  console.log(`Imported ${viewCount} event views.`);
}

// Runs the steps in order. Events must exist before bookings/views can point to them.
async function main() {
  // Every imported user can log in with password "dataset123"
  sharedPasswordHash = await bcrypt.hash('dataset123', 10);

  console.log(
    'Scanning event_attendees.csv / event_interest.csv for events with real interactions...',
  );
  const interactionIds = await collectInteractionEventIds();
  console.log(
    `Found ${interactionIds.size} events with at least one booking or view.`,
  );

  console.log(
    `Scanning events.csv to select up to ${MAX_EVENTS} events (prioritizing ones with interactions)...`,
  );
  const rows = await selectEventRows(interactionIds);
  console.log(`Selected ${rows.length} events from ${DATASET_DIR}.`);

  const events = await importEvents(rows);
  console.log(`Imported ${events.size} events.`);

  await importBookings(events);
  await importViews(events);

  console.log('Dataset import complete.');
}

// exit with code 1 on failure and always close the DB connection
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
