import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  it('uses view history when user has no bookings', async () => {
    const startDateTime = new Date('2026-07-01T20:00:00Z');
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) },
      event: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            eventId: 'EV10',
            title: 'Viewed',
            eventType: 'Concert',
            city: 'Athens',
            startDateTime,
            categories: [{ name: 'Music' }],
          },
          {
            id: 11,
            eventId: 'EV11',
            title: 'Recommended',
            eventType: 'Concert',
            city: 'Athens',
            startDateTime,
            categories: [{ name: 'Music' }],
          },
        ]),
      },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      eventView: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 1, eventId: 10 },
          { userId: 2, eventId: 10 },
        ]),
      },
    };
    const service = new RecommendationsService(prisma as never);

    const recommendations = await service.recommend(1, 2);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].id).toBe(11);
    expect(
      recommendations.every((event) => typeof event.score === 'number'),
    ).toBe(true);
  });

  it('uses bookings as stronger implicit feedback and excludes booked events', async () => {
    const startDateTime = new Date('2026-07-01T20:00:00Z');
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]) },
      event: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            eventId: 'EV10',
            title: 'Booked',
            eventType: 'Concert',
            city: 'Athens',
            startDateTime,
            categories: [{ name: 'Music' }],
          },
          {
            id: 11,
            eventId: 'EV11',
            title: 'Candidate',
            eventType: 'Concert',
            city: 'Athens',
            startDateTime,
            categories: [{ name: 'Music' }],
          },
        ]),
      },
      booking: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ attendeeId: 1, eventId: 10 }]),
      },
      eventView: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new RecommendationsService(prisma as never);

    const recommendations = await service.recommend(1, 10);

    expect(recommendations.map((event) => event.id)).toEqual([11]);
  });
});
