import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    event: { findUnique: jest.fn() },
    ticketType: { findFirst: jest.fn(), updateMany: jest.fn() },
    booking: { aggregate: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma as never);
    tx.event.findUnique.mockResolvedValue({
      id: 1,
      status: 'PUBLISHED',
      capacity: 5,
    });
    tx.ticketType.findFirst.mockResolvedValue({ id: 10, price: 12 });
    tx.booking.aggregate.mockResolvedValue({ _sum: { numberOfTickets: 3 } });
    tx.ticketType.updateMany.mockResolvedValue({ count: 1 });
    tx.booking.create.mockResolvedValue({ id: 7 });
    tx.booking.update.mockResolvedValue({ id: 7, bookingId: 'B7' });
  });

  it('rejects overselling total event capacity', async () => {
    await expect(
      service.create(2, { eventId: 1, ticketTypeId: 10, numberOfTickets: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects insufficient ticket type availability', async () => {
    tx.booking.aggregate.mockResolvedValue({ _sum: { numberOfTickets: 1 } });
    tx.ticketType.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.create(2, { eventId: 1, ticketTypeId: 10, numberOfTickets: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancelled events', async () => {
    tx.event.findUnique.mockResolvedValue({
      id: 1,
      status: 'CANCELLED',
      capacity: 5,
    });

    await expect(
      service.create(2, { eventId: 1, ticketTypeId: 10, numberOfTickets: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
