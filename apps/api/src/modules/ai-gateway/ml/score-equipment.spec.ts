import { scoreEquipmentSeries } from './score-equipment';

function series(tagName: string, values: number[]) {
  return { tagName, values };
}

describe('scoreEquipmentSeries', () => {
  it('returns null when the window is too short', () => {
    expect(scoreEquipmentSeries([series('A', [1, 2, 3])])).toBeNull();
  });

  it('flags a spiked tag as anomalous', () => {
    const normal = Array.from({ length: 80 }, (_, i) => 10 + Math.sin(i / 8) * 0.2);
    const spiked = [...normal.slice(0, 70), ...Array.from({ length: 10 }, () => 40)];
    const result = scoreEquipmentSeries(
      [series('P-101.VIBRATION', spiked), series('P-101.BEARING_TEMP', normal)],
      { seed: 3, threshold: 0.55 },
    );
    expect(result).not.toBeNull();
    expect(result?.contributors[0].tagName).toBe('P-101.VIBRATION');
  });
});
