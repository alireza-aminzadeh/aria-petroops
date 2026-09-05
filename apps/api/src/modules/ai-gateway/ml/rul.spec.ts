import { estimateRemainingUsefulLife, vibrationZone } from './rul';

describe('RUL analog', () => {
  it('maps ISO bands', () => {
    expect(vibrationZone(1.2)).toBe('A');
    expect(vibrationZone(3.0)).toBe('B');
    expect(vibrationZone(8.0)).toBe('D');
  });

  it('reduces remaining days when vibration and temperature rise', () => {
    const healthy = estimateRemainingUsefulLife({
      vibrationMmS: 1.5,
      bearingTempC: 68,
      criticality: 'medium',
    });
    const degraded = estimateRemainingUsefulLife({
      vibrationMmS: 8.2,
      bearingTempC: 96,
      criticality: 'high',
    });
    expect(degraded.remainingDays).toBeLessThan(healthy.remainingDays);
    expect(degraded.healthIndex).toBeLessThan(healthy.healthIndex);
  });
});
