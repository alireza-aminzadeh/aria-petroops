export const TAGS = [
  { tag: 'P-101.DISCHARGE_PRESSURE', baseline: 12.4, noise: 0.22 },
  { tag: 'P-101.BEARING_TEMP', baseline: 72, noise: 0.7 },
  { tag: 'P-101.VIBRATION', baseline: 2.05, noise: 0.1 },
  { tag: 'CDU-101.FEED_FLOW', baseline: 110, noise: 1.6 },
  { tag: 'CDU-101.OVHD_TEMP', baseline: 118, noise: 0.8 },
  { tag: 'CDU-101.ELEC_POWER', baseline: 620, noise: 10 },
  { tag: 'CDU-101.FUEL_GAS', baseline: 3100, noise: 35 },
  { tag: 'CDU-101.STEAM', baseline: 48, noise: 0.7 },
  { tag: 'CDU-101.FLARE_FLOW', baseline: 22, noise: 3 },
];

function hash(seed) {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

export function samplePlant(now = Date.now()) {
  const t = now / 1000;
  const minute = Math.floor(t / 60);
  const injectFault = minute % 11 === 0;
  return TAGS.map((spec, index) => {
    const n = (hash(Math.floor(t * 4) + index * 17) - 0.5) * 2 * spec.noise;
    let value = spec.baseline + n + Math.sin(t / 90 + index) * spec.noise;
    if (injectFault && spec.tag.endsWith('VIBRATION')) {
      value += 4.8;
    }
    if (injectFault && spec.tag.endsWith('BEARING_TEMP')) {
      value += 18;
    }
    if (injectFault && spec.tag.endsWith('FLARE_FLOW')) {
      value += 160;
    }
    return { tag: spec.tag, value: Number(value.toFixed(4)) };
  });
}
