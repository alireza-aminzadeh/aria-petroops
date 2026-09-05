/**
 * Isolation Forest (Liu, Ting, Zhou 2008).
 * Higher score ⇒ more anomalous. Pure TypeScript — fits the 2 vCPU on-prem budget.
 */
export type IsolationForestOptions = {
  treeCount?: number;
  sampleSize?: number;
  seed?: number;
};

type IsolationNode =
  | { kind: 'leaf'; size: number }
  | {
      kind: 'split';
      feature: number;
      split: number;
      left: IsolationNode;
      right: IsolationNode;
    };

export class IsolationForest {
  private readonly treeCount: number;
  private readonly sampleSize: number;
  private readonly rng: () => number;
  private trees: IsolationNode[] = [];
  private fitSize = 0;

  constructor(options: IsolationForestOptions = {}) {
    this.treeCount = options.treeCount ?? 80;
    this.sampleSize = options.sampleSize ?? 64;
    this.rng = mulberry32(options.seed ?? 0x0a11);
  }

  fit(samples: number[][]): void {
    if (samples.length === 0) {
      this.trees = [];
      this.fitSize = 0;
      return;
    }
    this.fitSize = samples.length;
    const psi = Math.min(this.sampleSize, samples.length);
    const maxDepth = Math.ceil(Math.log2(Math.max(psi, 2)));
    this.trees = [];
    for (let i = 0; i < this.treeCount; i += 1) {
      this.trees.push(this.buildTree(sampleRows(samples, psi, this.rng), 0, maxDepth));
    }
  }

  /** Anomaly score in (0, 1]. Typical inliers ≈ 0.4–0.5; outliers → 0.7+. */
  score(sample: number[]): number {
    if (this.trees.length === 0 || this.fitSize === 0) {
      return 0;
    }
    const avgPath =
      this.trees.reduce((sum, tree) => sum + pathLength(tree, sample, 0), 0) /
      this.trees.length;
    const c = averagePathLength(Math.min(this.sampleSize, this.fitSize));
    if (c <= 0) {
      return 0;
    }
    return Math.pow(2, -avgPath / c);
  }

  scores(samples: number[][]): number[] {
    return samples.map((sample) => this.score(sample));
  }

  private buildTree(rows: number[][], depth: number, maxDepth: number): IsolationNode {
    if (rows.length <= 1 || depth >= maxDepth) {
      return { kind: 'leaf', size: Math.max(rows.length, 1) };
    }
    const dim = rows[0]?.length ?? 0;
    if (dim === 0) {
      return { kind: 'leaf', size: rows.length };
    }
    const feature = Math.floor(this.rng() * dim);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const row of rows) {
      const value = row[feature] ?? 0;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (min === max) {
      return { kind: 'leaf', size: rows.length };
    }
    const split = min + this.rng() * (max - min);
    const left = rows.filter((row) => (row[feature] ?? 0) < split);
    const right = rows.filter((row) => (row[feature] ?? 0) >= split);
    if (left.length === 0 || right.length === 0) {
      return { kind: 'leaf', size: rows.length };
    }
    return {
      kind: 'split',
      feature,
      split,
      left: this.buildTree(left, depth + 1, maxDepth),
      right: this.buildTree(right, depth + 1, maxDepth),
    };
  }
}

export function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonic(n - 1) - (2 * (n - 1)) / n;
}

function harmonic(n: number): number {
  return Math.log(n) + 0.5772156649015329;
}

function pathLength(node: IsolationNode, sample: number[], depth: number): number {
  if (node.kind === 'leaf') {
    return depth + averagePathLength(node.size);
  }
  const value = sample[node.feature] ?? 0;
  return pathLength(value < node.split ? node.left : node.right, sample, depth + 1);
}

function sampleRows(samples: number[][], size: number, rng: () => number): number[][] {
  const copy = samples.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
