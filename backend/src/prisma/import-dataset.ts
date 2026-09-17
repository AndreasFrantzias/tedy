import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Imports a manageable part of the provided event recommendation dataset.
 * This gives the catalog enough real-looking events and interactions for the
 * Biased Matrix Factorization recommender to produce meaningful results.
 *
 * events.csv is anonymized (no titles/categories — only c_1..c_100 cluster
 * word-count columns), so Title/Category/Description are synthesized from
 * the dominant cluster and the event's city. Most rows with attendee/interest
 * data lack city/country text (only lat/lng), so those fall back to placeholders.
 *
 * We first pick events that appear in the attendee or interest files, otherwise
 * the imported catalog would have many events but almost no useful interactions.
 */

const MAX_EVENTS = Number(process.env.IMPORT_MAX_EVENTS ?? 600);
const DATASET_DIR = path.join(process.cwd(), '..', 'rel_event_csvs');

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

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const userIdCache = new Map<string, number>();
let sharedPasswordHash: string;

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

function splitCsvLine(line: string): string[] {
  return line.split(',');
}

/** Yields each data row (as split columns) from a CSV file, skipping the header line. */
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

interface RawEventRow {
  eventId: string;
  organizerUserId: string;
  startDate: Date;
  city: string;
  country: string;
  lat: number;
  lng: number;
  clusters: number[];
}

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

async function selectEventRows(
  interactionIds: Set<string>,
): Promise<RawEventRow[]> {
  const filePath = path.join(DATASET_DIR, 'events.csv');

  const priorityRows: RawEventRow[] = [];
  const fillerRows: RawEventRow[] = [];

  for await (const cols of readCsvRows(filePath)) {
    if (
      priorityRows.length >= interactionIds.size &&
      fillerRows.length >= MAX_EVENTS
    ) {
      break;
    }

    const [eventId, organizerUserId, startTime, city, , , country, lat, lng] =
      cols;
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
      clusters: cols.slice(9, 109).map((v) => Number(v) || 0),
    };

    if (interactionIds.has(eventId)) {
      priorityRows.push(row);
    } else if (fillerRows.length < MAX_EVENTS) {
      fillerRows.push(row);
    }
  }

  return [...priorityRows.slice(0, MAX_EVENTS), ...fillerRows].slice(
    0,
    MAX_EVENTS,
  );
}

interface ImportedEvent {
  dbId: number;
  ticketTypeDbId: number;
  price: number;
}

async function importEvents(
  rows: RawEventRow[],
): Promise<Map<string, ImportedEvent>> {
  const selected = new Map<string, ImportedEvent>();

  for (const row of rows) {
    let maxIndex = 0;
    for (let i = 1; i < row.clusters.length; i++) {
      if (row.clusters[i] > row.clusters[maxIndex]) {
        maxIndex = i;
      }
    }
    const category = CATEGORY_NAMES[maxIndex % CATEGORY_NAMES.length];

    const organizerId = row.organizerUserId
      ? await getOrCreateDatasetUser(row.organizerUserId)
      : await getOrCreateDatasetUser('fallback-organizer');

    const capacity = 50 + Math.floor(Math.random() * 250);
    const price = Math.round((5 + Math.random() * 45) * 100) / 100;
    const endDate = new Date(row.startDate.getTime() + 2 * 60 * 60 * 1000);

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
          categories: {
            connectOrCreate: {
              where: { name: category },
              create: { name: category },
            },
          },
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
    const imported = events.get(eventId);
    if (!imported) {
      continue;
    }

    const attendeeId = await getOrCreateDatasetUser(userId);

    const booking = await prisma.$transaction(async (tx) => {
      const decremented = await tx.ticketType.updateMany({
        where: { id: imported.ticketTypeDbId, available: { gte: 1 } },
        data: { available: { decrement: 1 } },
      });
      if (decremented.count === 0) {
        return null;
      }
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
        viewedAt: isNaN(viewedAt.getTime()) ? new Date() : viewedAt,
      },
    });
    viewCount++;
  }

  console.log(`Imported ${viewCount} event views.`);
}

async function main() {
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
