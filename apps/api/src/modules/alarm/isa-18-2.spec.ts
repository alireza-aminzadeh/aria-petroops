import { computeIsa182, evaluateAlarmLimits } from './isa-18-2';

describe('ISA-18.2 helpers', () => {
  it('detects hi/hh priority', () => {
    const hi = evaluateAlarmLimits(
      { tagName: 'P-101.VIBRATION', alarmHi: 4.5, alarmHh: 7.1 },
      8,
    );
    expect(hi?.alarmType).toBe('hh');
    expect(hi?.priority).toBe('critical');
  });

  it('flags flood when more than 10 alarms start in ten minutes', () => {
    const start = new Date('2026-09-05T10:00:00Z');
    const intervals = Array.from({ length: 12 }, (_, i) => ({
      tagId: `t-${i}`,
      startedAt: new Date(start.getTime() + i * 20_000),
      clearedAt: null,
    }));
    const kpi = computeIsa182(intervals, start, new Date(start.getTime() + 10 * 60_000));
    expect(kpi.flood).toBe(true);
    expect(kpi.peakPer10Min).toBeGreaterThanOrEqual(10);
  });

  it('marks chattering tags', () => {
    const start = new Date('2026-09-05T10:00:00Z');
    const intervals = [0, 1, 2].map((i) => ({
      tagId: 'same',
      startedAt: new Date(start.getTime() + i * 5_000),
      clearedAt: new Date(start.getTime() + i * 5_000 + 1000),
    }));
    const kpi = computeIsa182(intervals, start, new Date(start.getTime() + 10 * 60_000));
    expect(kpi.chatteringTagIds).toContain('same');
  });
});
