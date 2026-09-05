/** واحدهای صنعتی — جلوگیری از ناهماهنگی SI/Imperial در قراردادهای مشترک */
export const unitAliases: Record<string, string> = {
  bar: 'bar',
  psi: 'psi',
  c: 'degC',
  '°c': 'degC',
  degc: 'degC',
  k: 'K',
  m3h: 'm3/h',
  mm_s: 'mm/s',
};

export function normalizeUnit(raw: string): string {
  const key = raw.trim().toLowerCase();
  return unitAliases[key] ?? raw;
}
