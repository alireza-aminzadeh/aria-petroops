import { IsolationForest, averagePathLength } from './isolation-forest';

describe('IsolationForest', () => {
  it('scores far outliers higher than inliers', () => {
    const train: number[][] = [];
    for (let i = 0; i < 80; i += 1) {
      train.push([0.45 + (i % 7) * 0.01, 0.5 + (i % 5) * 0.01]);
    }
    const forest = new IsolationForest({ treeCount: 40, sampleSize: 32, seed: 7 });
    forest.fit(train);
    expect(forest.score([0.5, 0.52])).toBeLessThan(forest.score([9, 9]));
  });

  it('returns 0 when unfitted', () => {
    expect(new IsolationForest().score([1, 2])).toBe(0);
  });

  it('computes average path length for sample size', () => {
    expect(averagePathLength(1)).toBe(0);
    expect(averagePathLength(2)).toBe(1);
    expect(averagePathLength(256)).toBeGreaterThan(8);
  });
});
