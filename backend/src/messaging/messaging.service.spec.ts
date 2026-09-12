import { ForbiddenException } from '@nestjs/common';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  const prisma = {
    booking: { count: jest.fn(), findMany: jest.fn() },
    message: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    event: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
  };

  let service: MessagingService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 2, status: 'APPROVED' });
    service = new MessagingService(prisma as never);
  });

  it('rejects messages without organizer-attendee booking relationship', async () => {
    prisma.booking.count.mockResolvedValue(0);

    await expect(
      service.send(1, { recipientId: 2, subject: 'Hi', body: 'Body' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('broadcasts only to confirmed attendees of owned event', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 3, organizerId: 1 });
    prisma.booking.findMany.mockResolvedValue([
      { attendeeId: 2 },
      { attendeeId: 4 },
    ]);
    prisma.message.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.broadcast(1, 3, {
        subject: 'Cancelled',
        body: 'Event cancelled',
      }),
    ).resolves.toEqual({ sent: 2 });
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 3, status: 'CONFIRMED' } }),
    );
  });

  it('rejects reading someone else message', async () => {
    prisma.message.findUnique.mockResolvedValue({ id: 1, recipientId: 2 });

    await expect(service.markRead(1, 3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
