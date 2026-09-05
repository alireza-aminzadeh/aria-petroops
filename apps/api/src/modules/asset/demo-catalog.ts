import { DEFAULT_EMISSION_FACTORS_KG_CO2E } from '../energy/energy-factors';

export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_SITE_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_UNIT_ID = '33333333-3333-3333-3333-333333333333';

export type DemoTagSpec = {
  tagName: string;
  unitOfMeasure: string;
  alarmLl?: number;
  alarmLo?: number;
  alarmHi?: number;
  alarmHh?: number;
  baseline: number;
  noise: number;
};

export const PUMP_TAGS: DemoTagSpec[] = [
  {
    tagName: 'P-101.DISCHARGE_PRESSURE',
    unitOfMeasure: 'bar',
    alarmLo: 8,
    alarmHi: 14.5,
    alarmHh: 16,
    baseline: 12.4,
    noise: 0.25,
  },
  {
    tagName: 'P-101.BEARING_TEMP',
    unitOfMeasure: 'degC',
    alarmHi: 85,
    alarmHh: 95,
    baseline: 72,
    noise: 0.8,
  },
  {
    tagName: 'P-101.VIBRATION',
    unitOfMeasure: 'mm/s',
    alarmHi: 4.5,
    alarmHh: 7.1,
    baseline: 2.1,
    noise: 0.12,
  },
];

export const CDU_TAGS: DemoTagSpec[] = [
  {
    tagName: 'CDU-101.FEED_FLOW',
    unitOfMeasure: 'm3/h',
    alarmLo: 70,
    alarmHi: 150,
    baseline: 110,
    noise: 1.8,
  },
  {
    tagName: 'CDU-101.OVHD_TEMP',
    unitOfMeasure: 'degC',
    alarmHi: 145,
    alarmHh: 160,
    baseline: 118,
    noise: 0.9,
  },
  {
    tagName: 'CDU-101.ELEC_POWER',
    unitOfMeasure: 'kW',
    alarmHi: 900,
    baseline: 620,
    noise: 12,
  },
  {
    tagName: 'CDU-101.FUEL_GAS',
    unitOfMeasure: 'Sm3/h',
    alarmHi: 4200,
    baseline: 3100,
    noise: 40,
  },
  {
    tagName: 'CDU-101.STEAM',
    unitOfMeasure: 't/h',
    baseline: 48,
    noise: 0.8,
  },
  {
    tagName: 'CDU-101.FLARE_FLOW',
    unitOfMeasure: 'Sm3/h',
    alarmHi: 180,
    alarmHh: 320,
    baseline: 22,
    noise: 4,
  },
];

export const ENERGY_METER_SPECS = [
  {
    code: 'CDU-ELEC',
    name: 'برق واحد تقطیر',
    kind: 'electricity' as const,
    unitOfMeasure: 'kW',
    tagName: 'CDU-101.ELEC_POWER',
    emissionFactorKgCo2e: DEFAULT_EMISSION_FACTORS_KG_CO2E.electricity,
  },
  {
    code: 'CDU-FUEL',
    name: 'گاز سوخت کوره',
    kind: 'fuel_gas' as const,
    unitOfMeasure: 'Sm3/h',
    tagName: 'CDU-101.FUEL_GAS',
    emissionFactorKgCo2e: DEFAULT_EMISSION_FACTORS_KG_CO2E.fuel_gas,
  },
  {
    code: 'CDU-STEAM',
    name: 'بخار تولیدی/مصرفی',
    kind: 'steam' as const,
    unitOfMeasure: 't/h',
    tagName: 'CDU-101.STEAM',
    emissionFactorKgCo2e: DEFAULT_EMISSION_FACTORS_KG_CO2E.steam * 1000,
  },
  {
    code: 'CDU-FLARE',
    name: 'فلر واحد تقطیر',
    kind: 'flare' as const,
    unitOfMeasure: 'Sm3/h',
    tagName: 'CDU-101.FLARE_FLOW',
    emissionFactorKgCo2e: DEFAULT_EMISSION_FACTORS_KG_CO2E.flare,
  },
];
