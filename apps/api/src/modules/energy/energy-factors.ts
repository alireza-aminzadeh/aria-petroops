export type EnergyKind = 'electricity' | 'fuel_gas' | 'steam' | 'flare';

/**
 * Default emission factors for the demo plant. These are engineering
 * placeholders for Iranian-grid-ish / methane-rich fuel gas — they must be
 * replaced with the site’s measured GHG inventory before any compliance claim.
 */
export const DEFAULT_EMISSION_FACTORS_KG_CO2E: Record<EnergyKind, number> = {
  electricity: 0.65, // kg / kWh
  fuel_gas: 2.0, // kg / Sm3
  steam: 0.18, // kg / kg
  flare: 2.7, // kg / Sm3 (incomplete combustion allowance)
};

export function co2eKg(kind: EnergyKind, quantity: number, factor = DEFAULT_EMISSION_FACTORS_KG_CO2E[kind]): number {
  return quantity * factor;
}

export type EnergySnapshotRow = {
  kind: EnergyKind;
  quantity: number;
  factor: number;
};

export function summarizeEnergy(rows: EnergySnapshotRow[]) {
  const byKind = {
    electricity: 0,
    fuel_gas: 0,
    steam: 0,
    flare: 0,
  } satisfies Record<EnergyKind, number>;
  let co2e = 0;
  for (const row of rows) {
    byKind[row.kind] += row.quantity;
    co2e += co2eKg(row.kind, row.quantity, row.factor);
  }
  const feedOrSteam = byKind.steam || 1;
  return {
    byKind,
    co2eKg: co2e,
    flareRatio: byKind.flare === 0 ? 0 : byKind.flare / (byKind.fuel_gas + byKind.flare || 1),
    steamIntensity: byKind.electricity / feedOrSteam,
  };
}
