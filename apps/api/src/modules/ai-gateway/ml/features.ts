export type SeriesWindow = {
  tagName: string;
  values: number[];
};

export type FeatureContribution = {
  tagName: string;
  zScore: number;
  slope: number;
  last: number;
};

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function zScore(values: number[]): number {
  const last = values[values.length - 1] ?? 0;
  const sigma = stdev(values);
  if (sigma === 0) return 0;
  return (last - mean(values)) / sigma;
}

export function windowVector(series: SeriesWindow[]): number[] {
  const vector: number[] = [];
  for (const item of series) {
    vector.push(zScore(item.values), slope(item.values), item.values.at(-1) ?? 0);
  }
  return vector;
}

export function contributions(series: SeriesWindow[]): FeatureContribution[] {
  return series
    .map((item) => ({
      tagName: item.tagName,
      zScore: zScore(item.values),
      slope: slope(item.values),
      last: item.values.at(-1) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

export function slidingWindows(
  series: SeriesWindow[],
  windowSize: number,
  stride = 4,
): number[][] {
  const lengths = series.map((item) => item.values.length);
  const minLen = Math.min(...lengths, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(minLen) || minLen < windowSize) {
    return [];
  }
  const rows: number[][] = [];
  for (let end = windowSize; end <= minLen; end += stride) {
    rows.push(
      windowVector(
        series.map((item) => ({
          tagName: item.tagName,
          values: item.values.slice(end - windowSize, end),
        })),
      ),
    );
  }
  return rows;
}
