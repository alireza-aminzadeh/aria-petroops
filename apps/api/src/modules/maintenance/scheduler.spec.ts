import { prioritizeJobs, scheduleMaintenanceJobs, SchedulableJob } from './scheduler';

const NOW = new Date('2026-09-06T06:00:00.000Z'); // شروع شیفت کاری فرضی

function job(overrides: Partial<SchedulableJob> & { id: string }): SchedulableJob {
  return {
    equipmentTag: 'EQ-1',
    criticality: 'medium',
    estimatedHours: 2,
    dueAt: null,
    ...overrides,
  };
}

describe('prioritizeJobs', () => {
  it('puts overdue jobs before non-overdue jobs regardless of criticality', () => {
    const overdueLow = job({ id: 'overdue-low', criticality: 'low', dueAt: new Date('2026-09-01T00:00:00Z') });
    const futureCritical = job({ id: 'future-critical', criticality: 'critical', dueAt: new Date('2026-09-20T00:00:00Z') });
    const ordered = prioritizeJobs([futureCritical, overdueLow], NOW);
    expect(ordered.map((j) => j.id)).toEqual(['overdue-low', 'future-critical']);
  });

  it('orders by criticality (critical > high > medium > low) when overdue-ness ties', () => {
    const low = job({ id: 'low', criticality: 'low' });
    const critical = job({ id: 'critical', criticality: 'critical' });
    const high = job({ id: 'high', criticality: 'high' });
    const medium = job({ id: 'medium', criticality: 'medium' });
    const ordered = prioritizeJobs([low, critical, high, medium], NOW);
    expect(ordered.map((j) => j.id)).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('breaks criticality ties by earliest dueAt; jobs with no dueAt go last', () => {
    const noDue = job({ id: 'no-due', criticality: 'high', dueAt: null });
    const dueLater = job({ id: 'due-later', criticality: 'high', dueAt: new Date('2026-09-25T00:00:00Z') });
    const dueSooner = job({ id: 'due-sooner', criticality: 'high', dueAt: new Date('2026-09-10T00:00:00Z') });
    const ordered = prioritizeJobs([noDue, dueLater, dueSooner], NOW);
    expect(ordered.map((j) => j.id)).toEqual(['due-sooner', 'due-later', 'no-due']);
  });
});

describe('scheduleMaintenanceJobs', () => {
  it('returns an empty schedule when there are no technicians or no jobs', () => {
    expect(scheduleMaintenanceJobs([job({ id: 'a' })], [], {})).toEqual([]);
    expect(scheduleMaintenanceJobs([], [{ id: 't1', name: 'Tech 1' }], {})).toEqual([]);
  });

  it('schedules a single job starting exactly at the horizon', () => {
    const [assignment] = scheduleMaintenanceJobs(
      [job({ id: 'a', estimatedHours: 3 })],
      [{ id: 't1', name: 'Tech 1' }],
      { horizonStart: NOW },
    );
    expect(assignment.technicianId).toBe('t1');
    expect(assignment.scheduledStart.toISOString()).toBe(NOW.toISOString());
    expect(assignment.scheduledEnd.getTime() - assignment.scheduledStart.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it('load-balances across technicians: picks whichever technician is free soonest', () => {
    const jobs = [
      job({ id: 'a', estimatedHours: 4, criticality: 'critical' }),
      job({ id: 'b', estimatedHours: 4, criticality: 'high' }),
      job({ id: 'c', estimatedHours: 2, criticality: 'medium' }),
    ];
    const technicians = [{ id: 't1', name: 'Tech 1' }, { id: 't2', name: 'Tech 2' }];
    const result = scheduleMaintenanceJobs(jobs, technicians, { horizonStart: NOW, workingHoursPerDay: 8 });

    // a (critical) و b (high) هر دو در ابتدای افق شروع می‌شوند، هرکدام روی یک
    // تکنسین جدا (چون هر دو تکنسین آزادند و cursor برابر دارند)؛ c (medium)
    // باید روی همان تکنسینی برود که زودتر آزاد می‌شود.
    const a = result.find((r) => r.jobId === 'a')!;
    const b = result.find((r) => r.jobId === 'b')!;
    const c = result.find((r) => r.jobId === 'c')!;
    expect(new Set([a.technicianId, b.technicianId])).toEqual(new Set(['t1', 't2']));
    expect(a.scheduledStart.toISOString()).toBe(NOW.toISOString());
    expect(b.scheduledStart.toISOString()).toBe(NOW.toISOString());
    // c باید بعد از a یا b (هرکدام که تکنسینش را گرفت) شروع شود، نه هم‌زمان با آن‌ها.
    expect(c.scheduledStart.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 4 * 60 * 60 * 1000);
  });

  it('rolls a job over to the next day when it would exceed daily working-hour capacity', () => {
    const jobs = [
      job({ id: 'a', estimatedHours: 6 }),
      job({ id: 'b', estimatedHours: 5 }), // ۶+۵=۱۱ > ۸ ساعت روزانه => باید به روز بعد برود
    ];
    const result = scheduleMaintenanceJobs(jobs, [{ id: 't1', name: 'Tech 1' }], {
      horizonStart: NOW,
      workingHoursPerDay: 8,
    });
    const a = result.find((r) => r.jobId === 'a')!;
    const b = result.find((r) => r.jobId === 'b')!;
    expect(a.scheduledStart.getUTCDate()).toBe(NOW.getUTCDate());
    expect(b.scheduledStart.getUTCDate()).toBe(NOW.getUTCDate() + 1);
    // روز بعد از همان ساعت شیفت (۰۶:۰۰ UTC در این تست) شروع می‌شود، نه از جایی که روز قبل تمام شد.
    expect(b.scheduledStart.getUTCHours()).toBe(NOW.getUTCHours());
  });

  it('never double-books a technician (no overlapping assignments for the same technician)', () => {
    const jobs = Array.from({ length: 6 }, (_, i) => job({ id: `job-${i}`, estimatedHours: 3 }));
    const technicians = [{ id: 't1', name: 'Tech 1' }, { id: 't2', name: 'Tech 2' }];
    const result = scheduleMaintenanceJobs(jobs, technicians, { horizonStart: NOW });

    for (const tech of technicians) {
      const assignments = result
        .filter((r) => r.technicianId === tech.id)
        .sort((x, y) => x.scheduledStart.getTime() - y.scheduledStart.getTime());
      for (let i = 1; i < assignments.length; i += 1) {
        expect(assignments[i].scheduledStart.getTime()).toBeGreaterThanOrEqual(
          assignments[i - 1].scheduledEnd.getTime(),
        );
      }
    }
  });
});
