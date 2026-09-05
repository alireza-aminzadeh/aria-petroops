export type AlarmTransition = {
  tagId: string;
  equipmentId: string;
  tenantId: string;
  tagName: string;
  value: number;
  time: Date;
  alarmType: 'll' | 'lo' | 'hi' | 'hh';
  priority: 'journal' | 'low' | 'high' | 'critical';
  message: string;
};

export type TagAlarmLimits = {
  alarmLl?: number | null;
  alarmLo?: number | null;
  alarmHi?: number | null;
  alarmHh?: number | null;
};

export function evaluateAlarmLimits(
  tag: TagAlarmLimits & { tagName: string },
  value: number,
): Omit<AlarmTransition, 'tagId' | 'equipmentId' | 'tenantId' | 'time'> | null {
  if (tag.alarmHh != null && value >= tag.alarmHh) {
    return {
      tagName: tag.tagName,
      value,
      alarmType: 'hh',
      priority: 'critical',
      message: `${tag.tagName} از حد خیلی‌بالا (${tag.alarmHh}) عبور کرد.`,
    };
  }
  if (tag.alarmLl != null && value <= tag.alarmLl) {
    return {
      tagName: tag.tagName,
      value,
      alarmType: 'll',
      priority: 'critical',
      message: `${tag.tagName} از حد خیلی‌پایین (${tag.alarmLl}) عبور کرد.`,
    };
  }
  if (tag.alarmHi != null && value >= tag.alarmHi) {
    return {
      tagName: tag.tagName,
      value,
      alarmType: 'hi',
      priority: 'high',
      message: `${tag.tagName} از حد بالا (${tag.alarmHi}) عبور کرد.`,
    };
  }
  if (tag.alarmLo != null && value <= tag.alarmLo) {
    return {
      tagName: tag.tagName,
      value,
      alarmType: 'lo',
      priority: 'high',
      message: `${tag.tagName} از حد پایین (${tag.alarmLo}) عبور کرد.`,
    };
  }
  return null;
}

export type AlarmInterval = {
  tagId: string;
  startedAt: Date;
  clearedAt: Date | null;
};

export type Isa182Kpis = {
  windowMinutes: number;
  alarmCount: number;
  averagePer10Min: number;
  peakPer10Min: number;
  chatteringTagIds: string[];
  flood: boolean;
  standingCount: number;
  standingRatio: number;
};

const FLOOD_PER_10_MIN = 10;
const CHATTER_CHANGES = 3;

export function computeIsa182(
  intervals: AlarmInterval[],
  windowStart: Date,
  windowEnd: Date,
): Isa182Kpis {
  const windowMs = Math.max(windowEnd.getTime() - windowStart.getTime(), 1);
  const windowMinutes = windowMs / 60_000;
  const inWindow = intervals.filter(
    (item) =>
      item.startedAt <= windowEnd &&
      (item.clearedAt == null || item.clearedAt >= windowStart),
  );
  const starts = inWindow.filter(
    (item) => item.startedAt >= windowStart && item.startedAt <= windowEnd,
  );
  const buckets = new Map<number, number>();
  const bucketMs = 10 * 60_000;
  for (const item of starts) {
    const key = Math.floor((item.startedAt.getTime() - windowStart.getTime()) / bucketMs);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const peakPer10Min = [...buckets.values()].reduce((max, value) => Math.max(max, value), 0);
  const tenMinSlots = Math.max(windowMinutes / 10, 1);
  const chatterCounts = new Map<string, number>();
  for (const item of starts) {
    chatterCounts.set(item.tagId, (chatterCounts.get(item.tagId) ?? 0) + 1);
  }
  const chatteringTagIds = [...chatterCounts.entries()]
    .filter(([, count]) => count >= CHATTER_CHANGES)
    .map(([tagId]) => tagId);

  const standingCount = inWindow.filter((item) => item.clearedAt == null).length;
  return {
    windowMinutes,
    alarmCount: starts.length,
    averagePer10Min: starts.length / tenMinSlots,
    peakPer10Min,
    chatteringTagIds,
    flood: peakPer10Min >= FLOOD_PER_10_MIN,
    standingCount,
    standingRatio: inWindow.length === 0 ? 0 : standingCount / inWindow.length,
  };
}
