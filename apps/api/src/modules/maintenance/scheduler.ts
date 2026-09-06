/**
 * موتور heuristic زمان‌بندی نت/TAR — یک list-scheduler حریصانه (greedy) با
 * موازنهٔ بار (load balancing) بین تکنسین‌ها؛ نه یک solver بهینهٔ ریاضی
 * (CP-SAT/OR-Tools که در docs/10-roadmap.md فاز ۳ برای بهینه‌سازی
 * تولید/Blending رزرو شده — مسئلهٔ متفاوتی است). این الگوریتم برای
 * زمان‌بندی واقع‌گرایانهٔ کارهای نت (PM/CBM) و بازهٔ تعمیرات عمومی (TAR) کافی
 * و قابل‌اعتماد است:
 *
 *   ۱) کارها را طبق فوریت مرتب می‌کند: ابتدا کارهای معوق (nextDueAt گذشته)،
 *      سپس بر اساس criticality تجهیز (critical > high > medium > low)، در
 *      نهایت نزدیک‌ترین nextDueAt.
 *   ۲) هر کار را به تکنسینی می‌دهد که زودتر از همه آزاد می‌شود (موازنهٔ بار).
 *   ۳) ظرفیت روزانهٔ هر تکنسین را رعایت می‌کند (پیش‌فرض ۸ ساعت)؛ اگر کار در
 *      باقیماندهٔ روز جا نشود، به ابتدای روز کاری بعد منتقل می‌شود.
 *
 * محدودیت شناخته‌شده (به‌عمد ساده نگه‌داشته شده): تعطیلات آخر هفته را رد
 * نمی‌کند (هر روز calendar را روز کاری فرض می‌کند). برای V2 قابل افزودن است.
 */

export type CriticalityLevel = 'low' | 'medium' | 'high' | 'critical';

const CRITICALITY_WEIGHT: Record<CriticalityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export type SchedulableJob = {
  id: string;
  equipmentTag: string;
  criticality: CriticalityLevel;
  estimatedHours: number;
  /** تاریخ سررسید (nextDueAt)؛ null یعنی بدون فوریت خاص (آخر صف). */
  dueAt: Date | null;
};

export type SchedulerTechnician = {
  id: string;
  name: string;
};

export type ScheduledJob = {
  jobId: string;
  technicianId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
};

export type ScheduleOptions = {
  /** لحظهٔ شروع افق زمان‌بندی (پیش‌فرض: اکنون). */
  horizonStart?: Date;
  /** ساعت کاری در روز برای هر تکنسین (پیش‌فرض ۸). */
  workingHoursPerDay?: number;
};

/** کارها را طبق فوریت (معوق اول، بعد criticality، بعد نزدیک‌ترین سررسید) مرتب می‌کند. */
export function prioritizeJobs(jobs: SchedulableJob[], now: Date): SchedulableJob[] {
  return [...jobs].sort((a, b) => {
    const aOverdue = a.dueAt !== null && a.dueAt.getTime() < now.getTime();
    const bOverdue = b.dueAt !== null && b.dueAt.getTime() < now.getTime();
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const criticalityDiff = CRITICALITY_WEIGHT[b.criticality] - CRITICALITY_WEIGHT[a.criticality];
    if (criticalityDiff !== 0) return criticalityDiff;

    if (a.dueAt === null && b.dueAt === null) return 0;
    if (a.dueAt === null) return 1;
    if (b.dueAt === null) return -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
}

/**
 * روز کاری بعدی را دقیقاً در همان ساعت/دقیقهٔ شروع شیفت (UTC) می‌سازد — نه در
 * ساعتی که کار قبلی تصادفاً تمام شد. همه‌جا عمداً از متدهای UTC استفاده شده
 * (نه local time) تا نتیجه مستقل از timezone سرور/CI باشد.
 */
function startOfNextWorkingDay(shiftAnchor: { hourUTC: number; minuteUTC: number }, reference: Date): Date {
  const next = new Date(reference);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(shiftAnchor.hourUTC, shiftAnchor.minuteUTC, 0, 0);
  return next;
}

function addWorkingHours(
  cursor: Date,
  hoursUsedToday: number,
  hours: number,
  workingHoursPerDay: number,
  shiftAnchor: { hourUTC: number; minuteUTC: number },
): { start: Date; end: Date; nextCursor: Date; nextHoursUsedToday: number } {
  let start = cursor;
  let used = hoursUsedToday;

  if (used + hours > workingHoursPerDay) {
    // در باقیماندهٔ روز جا نمی‌شود؛ به ابتدای شیفت روز calendar بعد منتقل می‌شود.
    start = startOfNextWorkingDay(shiftAnchor, cursor);
    used = 0;
  }

  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start, end, nextCursor: end, nextHoursUsedToday: used + hours };
}

/**
 * تخصیص greedy با موازنهٔ بار: هر کار (طبق اولویت) به تکنسینی می‌رود که
 * زودتر از همه به آن کار می‌رسد (min-heap ساده روی cursor هر تکنسین).
 */
export function scheduleMaintenanceJobs(
  jobs: SchedulableJob[],
  technicians: SchedulerTechnician[],
  options: ScheduleOptions = {},
): ScheduledJob[] {
  if (technicians.length === 0 || jobs.length === 0) return [];

  const horizonStart = options.horizonStart ?? new Date();
  const workingHoursPerDay = options.workingHoursPerDay ?? 8;
  const shiftAnchor = { hourUTC: horizonStart.getUTCHours(), minuteUTC: horizonStart.getUTCMinutes() };

  const state = new Map<string, { cursor: Date; hoursUsedToday: number }>();
  for (const tech of technicians) {
    state.set(tech.id, { cursor: new Date(horizonStart), hoursUsedToday: 0 });
  }

  const ordered = prioritizeJobs(jobs, horizonStart);
  const result: ScheduledJob[] = [];

  for (const job of ordered) {
    // تکنسینی که cursor او زودتر از همه است را انتخاب می‌کند (موازنهٔ بار).
    let bestTechId = technicians[0].id;
    let bestCursor = state.get(bestTechId)!.cursor;
    for (const tech of technicians) {
      const candidate = state.get(tech.id)!.cursor;
      if (candidate.getTime() < bestCursor.getTime()) {
        bestTechId = tech.id;
        bestCursor = candidate;
      }
    }

    const current = state.get(bestTechId)!;
    const { start, end, nextCursor, nextHoursUsedToday } = addWorkingHours(
      current.cursor,
      current.hoursUsedToday,
      job.estimatedHours,
      workingHoursPerDay,
      shiftAnchor,
    );
    state.set(bestTechId, { cursor: nextCursor, hoursUsedToday: nextHoursUsedToday });

    result.push({
      jobId: job.id,
      technicianId: bestTechId,
      scheduledStart: start,
      scheduledEnd: end,
    });
  }

  return result;
}
