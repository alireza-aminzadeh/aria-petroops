import { IsolationForest } from './isolation-forest';
import {
  FeatureContribution,
  SeriesWindow,
  contributions,
  slidingWindows,
  windowVector,
} from './features';

export const ISOLATION_FOREST_THRESHOLD = 0.62;
export const FEATURE_WINDOW = 16;

export type AnomalyScoreResult = {
  score: number;
  isAnomaly: boolean;
  contributors: FeatureContribution[];
  sampleCount: number;
  method: 'isolation_forest';
};

export function scoreEquipmentSeries(
  series: SeriesWindow[],
  options?: { threshold?: number; seed?: number },
): AnomalyScoreResult | null {
  const usable = series.filter((item) => item.values.length >= FEATURE_WINDOW);
  if (usable.length === 0) {
    return null;
  }
  const train = slidingWindows(usable, FEATURE_WINDOW, 4);
  if (train.length < 4) {
    return null;
  }
  const forest = new IsolationForest({
    treeCount: 60,
    sampleSize: Math.min(64, train.length),
    seed: options?.seed ?? 0x51f0,
  });
  forest.fit(train);
  const latest = windowVector(
    usable.map((item) => ({
      tagName: item.tagName,
      values: item.values.slice(-FEATURE_WINDOW),
    })),
  );
  const score = forest.score(latest);
  const threshold = options?.threshold ?? ISOLATION_FOREST_THRESHOLD;
  return {
    score,
    isAnomaly: score >= threshold,
    contributors: contributions(usable).slice(0, 5),
    sampleCount: train.length,
    method: 'isolation_forest',
  };
}
