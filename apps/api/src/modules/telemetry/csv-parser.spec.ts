import { parseCsvReadings } from './csv-parser';

describe('parseCsvReadings', () => {
  it('parses valid rows', () => {
    const csv = [
      'tag_name,time,value,quality',
      'P-101.DISCHARGE_PRESSURE,2026-09-05T10:00:00Z,12.4,0',
      'P-101.BEARING_TEMP,2026-09-05T10:00:00Z,71.2,0',
    ].join('\n');

    const rows = parseCsvReadings(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].tag_name).toBe('P-101.DISCHARGE_PRESSURE');
    expect(rows[0].value).toBe(12.4);
  });

  it('rejects missing header', () => {
    expect(() => parseCsvReadings('foo,bar\n1,2')).toThrow(/ستون اجباری/);
  });
});
