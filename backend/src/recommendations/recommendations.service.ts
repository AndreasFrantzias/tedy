import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BiasedMatrixFactorization, Interaction } from './bmf';

const BOOKING_WEIGHT = 1.0;
const VIEW_WEIGHT = 0.3;
const MAX_VIEW_WEIGHT = 0.8;
const NEGATIVE_WEIGHT = 0.0;
const NEGATIVE_SAMPLES_PER_USER = 3;

type RecommendationEvent = {
  id: number;
  eventId: string;
  title: string;
  eventType: string;
  city: string;
  startDateTime: Date;
  categories: { name: string }[];
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(userId: number, limit = 10) {
    const [users, events, bookings, views] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true } }),
      this.prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          eventId: true,
          title: true,
          eventType: true,
          city: true,
          startDateTime: true,
          categories: { select: { name: true } },
        },
      }),
      this.prisma.booking.findMany({
        where: { status: 'CONFIRMED' },
        select: { attendeeId: true, eventId: true },
      }),
      this.prisma.eventView.findMany({
        select: { userId: true, eventId: true },
      }),
    ]);

    const userIndex = new Map<number, number>(users.map((u, i) => [u.id, i]));
    const eventIndex = new Map<number, number>(events.map((e, i) => [e.id, i]));

    // A booking is a stronger signal than repeated page views.
    const ratingMap = new Map<string, number>();
    for (const view of views) {
      if (!eventIndex.has(view.eventId) || !userIndex.has(view.userId))
        continue;
      const key = `${view.userId}:${view.eventId}`;
      ratingMap.set(
        key,
        Math.min(MAX_VIEW_WEIGHT, (ratingMap.get(key) ?? 0) + VIEW_WEIGHT),
      );
    }
    for (const booking of bookings) {
      if (
        !eventIndex.has(booking.eventId) ||
        !userIndex.has(booking.attendeeId)
      )
        continue;
      const key = `${booking.attendeeId}:${booking.eventId}`;
      ratingMap.set(key, BOOKING_WEIGHT);
    }

    const interactions: Interaction[] = [];
    for (const [key, rating] of ratingMap) {
      const [u, e] = key.split(':').map(Number);
      interactions.push({
        userIndex: userIndex.get(u)!,
        itemIndex: eventIndex.get(e)!,
        rating,
      });
    }

    interactions.push(...this.buildNegativeSamples(ratingMap, users, events));

    const bookedEventIds = new Set(
      bookings.filter((b) => b.attendeeId === userId).map((b) => b.eventId),
    );
    const viewedEventIds = new Set(
      views.filter((v) => v.userId === userId).map((v) => v.eventId),
    );
    const interactedEventIds = new Set([...bookedEventIds, ...viewedEventIds]);

    const hasUserHistory = [...ratingMap.keys()].some((key) =>
      key.startsWith(`${userId}:`),
    );

    if (!hasUserHistory || !userIndex.has(userId)) {
      return this.popularityFallback(
        events,
        bookings,
        views,
        interactedEventIds,
        limit,
      );
    }

    // For this coursework-sized dataset, retraining on request keeps the result current.
    const model = new BiasedMatrixFactorization({
      numFactors: 10,
      learningRate: 0.01,
      regularization: 0.02,
      epochs: 80,
      seed: 20260625,
    });
    model.fit(interactions, users.length, events.length);

    const uIdx = userIndex.get(userId)!;
    const scored = events
      .filter((e) => !interactedEventIds.has(e.id))
      .map((e) => ({
        event: e,
        score: model.predictIndices(uIdx, eventIndex.get(e.id)!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ event, score }) => ({ ...event, score }));
  }

  private buildNegativeSamples(
    ratingMap: Map<string, number>,
    users: { id: number }[],
    events: RecommendationEvent[],
  ): Interaction[] {
    if (events.length === 0) {
      return [];
    }

    const samples: Interaction[] = [];
    const interactedByUser = new Map<number, Set<number>>();
    for (const key of ratingMap.keys()) {
      const [userId, eventId] = key.split(':').map(Number);
      if (!interactedByUser.has(userId)) {
        interactedByUser.set(userId, new Set());
      }
      interactedByUser.get(userId)!.add(eventId);
    }

    users.forEach((user, userIdx) => {
      const interacted = interactedByUser.get(user.id);
      if (!interacted?.size || interacted.size >= events.length) {
        return;
      }
      const candidates = events
        .map((event, itemIndex) => ({ event, itemIndex }))
        .filter(({ event }) => !interacted.has(event.id));
      const start = user.id % candidates.length;
      for (
        let offset = 0;
        offset < Math.min(NEGATIVE_SAMPLES_PER_USER, candidates.length);
        offset++
      ) {
        const candidate = candidates[(start + offset) % candidates.length];
        samples.push({
          userIndex: userIdx,
          itemIndex: candidate.itemIndex,
          rating: NEGATIVE_WEIGHT,
        });
      }
    });

    return samples;
  }

  private popularityFallback(
    events: RecommendationEvent[],
    bookings: { eventId: number }[],
    views: { eventId: number }[],
    excludeEventIds: Set<number>,
    limit: number,
  ) {
    const popularity = new Map<number, number>();
    for (const b of bookings) {
      popularity.set(
        b.eventId,
        (popularity.get(b.eventId) ?? 0) + BOOKING_WEIGHT,
      );
    }
    for (const v of views) {
      popularity.set(v.eventId, (popularity.get(v.eventId) ?? 0) + VIEW_WEIGHT);
    }

    return events
      .filter((e) => !excludeEventIds.has(e.id))
      .map((e) => ({ event: e, score: popularity.get(e.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ event, score }) => ({ ...event, score }));
  }
}
