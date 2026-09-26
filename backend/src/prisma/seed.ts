import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // The administrator is available immediately after seeding
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      roles: ['admin'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
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

  // Demo organizer used for creating and managing the seeded event.
  const organizerPasswordHash = await bcrypt.hash('organizer123', 10);
  const organizer = await prisma.user.upsert({
    where: { username: 'organizer' },
    update: {
      email: 'organizer@example.com',
      passwordHash: organizerPasswordHash,
      roles: ['organizer'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'organizer',
      email: 'organizer@example.com',
      passwordHash: organizerPasswordHash,
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

  // Demo attendee used for browsing, booking, messaging, and recommendations.
  const userPasswordHash = await bcrypt.hash('user1234', 10);
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      roles: ['attendee'],
      active: true,
      status: 'APPROVED',
    },
    create: {
      username: 'user',
      email: 'user@example.com',
      passwordHash: userPasswordHash,
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

  const startDateTime = new Date();
  startDateTime.setDate(startDateTime.getDate() + 14);
  startDateTime.setHours(20, 0, 0, 0);
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

  await prisma.event.upsert({
    where: { eventId: 'DEMO-ATHENS-1' },
    update: {
      title: 'Athens Demo Music Night',
      eventType: 'Music',
      venue: 'Technopolis City Stage',
      address: 'Pireos 100',
      city: 'Athens',
      country: 'Greece',
      lat: 37.9783,
      lng: 23.7134,
      startDateTime,
      endDateTime,
      capacity: 120,
      status: 'PUBLISHED',
      description:
        'A seeded published event for manual browsing, booking, and search checks.',
      organizerId: organizer.id,
      categories: {
        set: [],
        connectOrCreate: [
          { where: { name: 'Music' }, create: { name: 'Music' } },
        ],
      },
      ticketTypes: {
        deleteMany: {},
        create: [
          {
            ticketTypeId: 'GENERAL',
            name: 'General Admission',
            price: 15,
            quantity: 120,
            available: 120,
          },
        ],
      },
      photos: { deleteMany: {} },
    },
    create: {
      eventId: 'DEMO-ATHENS-1',
      title: 'Athens Demo Music Night',
      eventType: 'Music',
      venue: 'Technopolis City Stage',
      address: 'Pireos 100',
      city: 'Athens',
      country: 'Greece',
      lat: 37.9783,
      lng: 23.7134,
      startDateTime,
      endDateTime,
      capacity: 120,
      status: 'PUBLISHED',
      description:
        'A seeded published event for manual browsing, booking, and search checks.',
      organizerId: organizer.id,
      categories: {
        connectOrCreate: [
          { where: { name: 'Music' }, create: { name: 'Music' } },
        ],
      },
      ticketTypes: {
        create: [
          {
            ticketTypeId: 'GENERAL',
            name: 'General Admission',
            price: 15,
            quantity: 120,
            available: 120,
          },
        ],
      },
    },
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
