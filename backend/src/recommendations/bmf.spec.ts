import { BiasedMatrixFactorization, Interaction } from './bmf';

describe('BiasedMatrixFactorization', () => {
  it('learns to rank a user higher on items they rated highly', () => {
    // 3 users, 4 items. User 0 strongly prefers item 0, user 1 prefers item 1, etc.
    const interactions: Interaction[] = [
      { userIndex: 0, itemIndex: 0, rating: 1.0 },
      { userIndex: 0, itemIndex: 1, rating: 0.1 },
      { userIndex: 1, itemIndex: 1, rating: 1.0 },
      { userIndex: 1, itemIndex: 2, rating: 0.1 },
      { userIndex: 2, itemIndex: 2, rating: 1.0 },
      { userIndex: 2, itemIndex: 3, rating: 0.1 },
    ];

    const model = new BiasedMatrixFactorization({
      numFactors: 4,
      learningRate: 0.05,
      regularization: 0.02,
      epochs: 200,
    });
    model.fit(interactions, 3, 4);

    const scoreUser0Item0 = model.predictIndices(0, 0);
    const scoreUser0Item3 = model.predictIndices(0, 3);
    expect(scoreUser0Item0).toBeGreaterThan(scoreUser0Item3);

    const scoreUser1Item1 = model.predictIndices(1, 1);
    const scoreUser1Item3 = model.predictIndices(1, 3);
    expect(scoreUser1Item1).toBeGreaterThan(scoreUser1Item3);
  });

  it('handles empty interactions without throwing', () => {
    const model = new BiasedMatrixFactorization();
    expect(() => model.fit([], 0, 0)).not.toThrow();
  });

  it('is deterministic for the same training data and seed', () => {
    const interactions: Interaction[] = [
      { userIndex: 0, itemIndex: 0, rating: 1.0 },
      { userIndex: 0, itemIndex: 1, rating: 0.0 },
      { userIndex: 1, itemIndex: 1, rating: 1.0 },
    ];
    const options = { numFactors: 3, epochs: 50, seed: 42 };
    const a = new BiasedMatrixFactorization(options);
    const b = new BiasedMatrixFactorization(options);

    a.fit(interactions, 2, 2);
    b.fit(interactions, 2, 2);

    expect(a.predictIndices(0, 0)).toBeCloseTo(b.predictIndices(0, 0), 12);
    expect(a.predictIndices(1, 1)).toBeCloseTo(b.predictIndices(1, 1), 12);
  });
});
