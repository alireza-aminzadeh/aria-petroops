import { co2eKg, summarizeEnergy } from './energy-factors';

describe('energy factors', () => {
  it('computes CO2e from default electricity factor', () => {
    expect(co2eKg('electricity', 100)).toBeCloseTo(65);
  });

  it('summarizes flare ratio', () => {
    const summary = summarizeEnergy([
      { kind: 'fuel_gas', quantity: 80, factor: 2 },
      { kind: 'flare', quantity: 20, factor: 2.7 },
    ]);
    expect(summary.flareRatio).toBeCloseTo(0.2);
    expect(summary.co2eKg).toBeGreaterThan(0);
  });
});
