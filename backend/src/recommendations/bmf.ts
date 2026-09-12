export interface Interaction {
  userIndex: number;
  itemIndex: number;
  rating: number;
}

export interface BmfOptions {
  numFactors?: number;
  learningRate?: number;
  regularization?: number;
  epochs?: number;
  seed?: number;
}

/**
 * Small Biased Matrix Factorization implementation for the recommender.
 * It is trained from scratch with stochastic gradient descent.
 */
export class BiasedMatrixFactorization {
  private readonly numFactors: number;
  private readonly learningRate: number;
  private readonly regularization: number;
  private readonly epochs: number;
  private readonly seed: number;

  private mu = 0;
  private userBias: Float64Array = new Float64Array(0);
  private itemBias: Float64Array = new Float64Array(0);
  private userFactors: Float64Array[] = [];
  private itemFactors: Float64Array[] = [];

  constructor(options: BmfOptions = {}) {
    this.numFactors = options.numFactors ?? 10;
    this.learningRate = options.learningRate ?? 0.01;
    this.regularization = options.regularization ?? 0.02;
    this.epochs = options.epochs ?? 50;
    this.seed = options.seed ?? 1337;
  }

  fit(interactions: Interaction[], numUsers: number, numItems: number): void {
    this.mu =
      interactions.length === 0
        ? 0
        : interactions.reduce((sum, r) => sum + r.rating, 0) /
          interactions.length;

    this.userBias = new Float64Array(numUsers);
    this.itemBias = new Float64Array(numItems);
    const random = mulberry32(this.seed);
    this.userFactors = Array.from({ length: numUsers }, () =>
      randomVector(this.numFactors, random),
    );
    this.itemFactors = Array.from({ length: numItems }, () =>
      randomVector(this.numFactors, random),
    );

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (const { userIndex, itemIndex, rating } of interactions) {
        const pu = this.userFactors[userIndex];
        const qi = this.itemFactors[itemIndex];

          const prediction = this.predictIndices(userIndex, itemIndex);
          const error = rating - prediction;

        this.userBias[userIndex] +=
          this.learningRate *
          (error - this.regularization * this.userBias[userIndex]);
        this.itemBias[itemIndex] +=
          this.learningRate *
          (error - this.regularization * this.itemBias[itemIndex]);

        for (let f = 0; f < this.numFactors; f++) {
          const puf = pu[f];
          const qif = qi[f];
          pu[f] +=
            this.learningRate * (error * qif - this.regularization * puf);
          qi[f] +=
            this.learningRate * (error * puf - this.regularization * qif);
        }
      }
    }
  }

  predictIndices(userIndex: number, itemIndex: number): number {
    if (!this.hasUser(userIndex) || itemIndex < 0 || itemIndex >= this.itemFactors.length) {
      return this.mu;
    }
    const pu = this.userFactors[userIndex];
    const qi = this.itemFactors[itemIndex];
    let dot = 0;
    for (let f = 0; f < pu.length; f++) {
      dot += pu[f] * qi[f];
    }
    return this.mu + this.userBias[userIndex] + this.itemBias[itemIndex] + dot;
  }

  hasUser(userIndex: number): boolean {
    return userIndex >= 0 && userIndex < this.userFactors.length;
  }
}

function randomVector(size: number, random: () => number): Float64Array {
  const v = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    v[i] = (random() - 0.5) * 0.1;
  }
  return v;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
