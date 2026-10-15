import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

/**
 * Main seed function that populates the database with users, events, bookings and views
 * from the CSV files located in the `./data/rel_event_csvs` directory.
 */
export async function runSeed() {
  console.log('Seeding database...');

  // Shared password for all dataset users
  const sharedPasswordHash = await bcrypt.hash('dataset123', 10);

  // Create default users (admin, organizer, user)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['admin'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['admin'],
      active: true,
      status: 'APPROVED',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '0000000000',
      address: 'N/A',
      city: 'Athens',
      country: 'Greece',
      afm: '000000000',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { username: 'organizer' },
    update: {
      email: 'organizer@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['organizer'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'organizer',
      email: 'organizer@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['organizer'],
      active: true,
      status: 'APPROVED',
      firstName: 'Maria',
      lastName: 'Organizer',
      phone: '6900000001',
      address: 'Kentriki 25',
      city: 'Athens',
      country: 'Greece',
      afm: '111111111',
    },
  });

  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      email: 'user@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['attendee'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'user',
      email: 'user@example.com',
      passwordHash: sharedPasswordHash,
      roles: ['attendee'],
      active: true,
      status: 'APPROVED',
      firstName: 'John',
      lastName: 'Attendee',
      phone: '6900000002',
      address: 'Patision 10',
      city: 'Athens',
      country: 'Greece',
      afm: '222222222',
    },
  });

  // Map to keep track of dataset IDs to DB IDs
  const userIdCache = new Map<string, number>();
  const eventIdCache = new Map<string, number>();
  const ticketTypeIdCache = new Map<string, number>();

  // Helper to get or create a dataset user
  async function getOrCreateDatasetUser(datasetUserId: string): Promise<number> {
    const cached = userIdCache.get(datasetUserId);
    if (cached !== undefined) return cached;

    const username = `ds_${datasetUserId}`;
    const dbUser = await prisma.user.upsert({
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
    userIdCache.set(datasetUserId, dbUser.id);
    return dbUser.id;
  }

  // Fallback organizer for events without an organizer
  const fallbackOrganizer = await prisma.user.upsert({
    where: { username: 'ds_fallback-organizer' },
    update: {},
    create: {
      username: 'ds_fallback-organizer',
      email: 'ds_fallback-organizer@dataset.local',
      passwordHash: sharedPasswordHash,
      roles: ['organizer'],
      active: true,
      status: 'APPROVED',
    },
  });

  // Path to the CSV directory
  const CSV_DIR = path.join(process.cwd(), 'data/rel_event_csvs');

  // 1. Import events
  const eventsStream = fs
    .createReadStream(path.join(CSV_DIR, 'events.csv'))
    .pipe(csv({ headers: true, skipLines: 0 }));

  let eventCount = 0;
  for await (const row of eventsStream) {
    if (eventCount >= 1000) {
      break; 
    }

    const values = Object.values(row) as string[];
    // Map standard dataset columns by their index position
    const eventId = values[0];
    const organizerUserId = values[1];
    const startDateStr = values[2];
    const city = values[3];
    const country = values[6];
    const lat = values[7];
    const lng = values[8];

    // Basic validation
    if (!eventId || !startDateStr || !city || !country || !lat || !lng) {
      continue;
    }

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) continue;

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const organizerId = organizerUserId
      ? await getOrCreateDatasetUser(organizerUserId)
      : fallbackOrganizer.id;

    const capacity = 100;
    const price = 10;

    const createdEvent = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          eventId: 'PENDING',
          title: `Event ${eventId}`,
          eventType: 'General',
          venue: `${city} Venue`,
          address: `${city} Main Street`,
          city: city,
          country: country,
          lat: Number(lat),
          lng: Number(lng),
          startDateTime: startDate,
          endDateTime: endDate,
          capacity,
          status: 'PUBLISHED',
          description: `Imported event ${eventId}`,
          organizerId,
          categories: {
            connectOrCreate: {
              where: { name: 'General' },
              create: { name: 'General' },
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
        where: { id: ev.id },
        data: { eventId: `EV${ev.id}` },
        include: { ticketTypes: true },
      });
    });

    eventIdCache.set(eventId, createdEvent.id);
    ticketTypeIdCache.set(eventId, createdEvent.ticketTypes[0].id);
    eventCount++;
  }
  console.log(`Imported ${eventCount} events.`);
  // 2. Import bookings from event_attendees.csv
  const attendeesStream = fs
    .createReadStream(path.join(CSV_DIR, 'event_attendees.csv'))
    .pipe(csv({ headers: true, skipLines: 0 }));

  let bookingCount = 0;
  for await (const row of attendeesStream) {
    if (bookingCount >= 1000) {
      attendeesStream.destroy(); 
      break;
    }

    const values = Object.values(row) as string[];
    // Map columns by index based on your original destructuring [_, eventId, status, userId]
    const userId = values[0];
    const eventId = values[1];
    const status = values[2];

    if (status !== 'yes' || !eventId || !userId) continue;

    const dbEventId = eventIdCache.get(eventId);
    if (!dbEventId) continue; // skip events not imported

    const dbUserId = await getOrCreateDatasetUser(userId);
    const ticketTypeDbId = ticketTypeIdCache.get(eventId);
    if (!ticketTypeDbId) continue;

    const booking = await prisma.$transaction(async (tx) => {
      const dec = await tx.ticketType.updateMany({
        where: { id: ticketTypeDbId, available: { gte: 1 } },
        data: { available: { decrement: 1 } },
      });
      if (dec.count === 0) return null;

      const created = await tx.booking.create({
        data: {
          bookingId: 'PENDING',
          eventId: dbEventId,
          attendeeId: dbUserId,
          ticketTypeId: ticketTypeDbId,
          numberOfTickets: 1,
          totalCost: 10,
          status: 'CONFIRMED',
        },
      });
      return tx.booking.update({
        where: { id: created.id },
        data: { bookingId: `B${created.id}` },
      });
    });

    if (booking) bookingCount++;
  }
  console.log(`Imported ${bookingCount} bookings.`);
  // 3. Import views from event_interest.csv
  const viewsStream = fs
    .createReadStream(path.join(CSV_DIR, 'event_interest.csv'))
    .pipe(csv({ headers: true, skipLines: 0 }));

  let viewCount = 0;
  for await (const row of viewsStream) {
    if (viewCount >= 1000) {
      viewsStream.destroy();
      break;
    }
    const values = Object.values(row) as string[];
    const userId = values[0];
    const eventId = values[1];
    const timestamp = values[4]; // or whichever index holds the date!

    if (!userId || !eventId) continue;

    const dbEventId = eventIdCache.get(eventId);
    if (!dbEventId) continue;

    const dbUserId = await getOrCreateDatasetUser(userId);
    const viewedAt = new Date(timestamp);
    
    await prisma.eventView.create({
      data: {
        userId: dbUserId,
        eventId: dbEventId,
        viewedAt: isNaN(viewedAt.getTime()) ? new Date() : viewedAt,
      },
    });
    viewCount++;
  }
  console.log(`Imported ${viewCount} event views.`);

  console.log('Database seeding completed.');
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
