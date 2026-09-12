import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const prisma = {
    $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
      callback(prisma),
    ),
    $queryRaw: jest.fn(),
    event: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    booking: { aggregate: jest.fn() },
    ticketType: { deleteMany: jest.fn() },
    category: { findMany: jest.fn() },
    eventView: { create: jest.fn() },
  };

  let service: EventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventsService(prisma as never);
  });

  const createDto = {
    title: 'Concert',
    eventType: 'Concert',
    venue: 'Hall',
    address: 'Main 1',
    city: 'Athens',
    country: 'Greece',
    startDateTime: '2026-07-01T20:00:00.000Z',
    endDateTime: '2026-07-01T22:00:00.000Z',
    capacity: 10,
    description: 'Desc',
    categories: ['Music'],
    ticketTypes: [
      { ticketTypeId: 'T1', name: 'General', price: 10, quantity: 5 },
    ],
  };

  it('rejects ticket totals above capacity', async () => {
    await expect(
      service.create(1, {
        ...createDto,
        capacity: 2,
        ticketTypes: [
          { ticketTypeId: 'T1', name: 'General', price: 10, quantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate ticket type IDs', async () => {
    await expect(
      service.create(1, {
        ...createDto,
        ticketTypes: [
          { ticketTypeId: 'T1', name: 'General', price: 10, quantity: 1 },
          { ticketTypeId: 'T1', name: 'Student', price: 5, quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reducing capacity below existing bookings', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 1,
      organizerId: 1,
      capacity: 10,
      status: 'DRAFT',
      startDateTime: new Date('2026-07-01T20:00:00.000Z'),
      endDateTime: new Date('2026-07-01T22:00:00.000Z'),
      ticketTypes: [{ quantity: 10 }],
      _count: { bookings: 1 },
    });
    prisma.booking.aggregate.mockResolvedValue({
      _sum: { numberOfTickets: 5 },
    });

    await expect(service.update(1, 1, { capacity: 4 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows deleting published events before the first booking', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 1,
      organizerId: 1,
      status: 'PUBLISHED',
      ticketTypes: [],
      _count: { bookings: 0 },
    });
    prisma.event.delete.mockResolvedValue({});

    await expect(service.remove(1, 1)).resolves.toEqual({ deleted: true });
  });

  it('rejects deleting events after the first booking', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 1,
      organizerId: 1,
      status: 'DRAFT',
      ticketTypes: [],
      _count: { bookings: 1 },
    });

    await expect(service.remove(1, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects non-owner updates', async () => {
    prisma.event.findUnique.mockResolvedValue({
      organizerId: 2,
      ticketTypes: [],
      _count: { bookings: 0 },
    });

    await expect(
      service.update(1, 1, { title: 'Nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
