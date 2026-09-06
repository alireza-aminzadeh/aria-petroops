import { FormEvent, useEffect, useState } from 'react';
import { api, hasRole } from '../lib/api';
import { statusLabel } from '../lib/labels';
import { useDateFormat } from '../lib/date';

type Plan = {
  id: string;
  planType: string;
  status: string;
  frequencyDays?: number;
  nextDueAt?: string | null;
  estimatedHours?: number | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  equipment: { tagNumber: string };
  assignedTo?: { id: string; fullName: string } | null;
};

type Equipment = { id: string; tagNumber: string };

type ScheduleResult = { scheduled: number };

export function MaintenancePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [planType, setPlanType] = useState('PM');
  const { dateTime } = useDateFormat();
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const canEdit = hasRole('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER');

  async function load() {
    const [list, assets] = await Promise.all([
      api<Plan[]>('/maintenance-plans'),
      api<Equipment[]>('/equipment'),
    ]);
    setPlans(list);
    setEquipment(assets);
    if (!equipmentId && assets[0]) setEquipmentId(assets[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/maintenance-plans', {
        method: 'POST',
        body: JSON.stringify({ equipmentId, planType, frequencyDays, estimatedHours }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت ناموفق');
    }
  }

  async function setStatus(id: string, status: string) {
    setError(null);
    try {
      await api(`/maintenance-plans/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق');
    }
  }

  /** موتور heuristic زمان‌بندی نت/TAR: برنامه‌های تأییدشدهٔ دارای estimatedHours را بین تکنسین‌ها توزیع می‌کند. */
  async function runScheduler() {
    setScheduling(true);
    setScheduleMessage(null);
    setError(null);
    try {
      const result = await api<ScheduleResult>('/maintenance-plans/schedule', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setScheduleMessage(
        result.scheduled > 0
          ? `${result.scheduled} برنامه زمان‌بندی شد.`
          : 'برنامهٔ «تأییدشده» با ساعت برآوردی برای زمان‌بندی وجود ندارد.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'زمان‌بندی خودکار ناموفق بود.');
    } finally {
      setScheduling(false);
    }
  }

  return (
    <section className="grid lg:grid-cols-[20rem_1fr] gap-6">
      {canEdit ? (
        <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-5 h-fit">
          <h3 className="font-medium mb-4">برنامه PM/CBM</h3>
          {error ? <p className="text-rust text-sm mb-3">{error}</p> : null}
          <select
            className="w-full mb-3 rounded-lg bg-ink border border-line px-3 py-2"
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
          >
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tagNumber}
              </option>
            ))}
          </select>
          <select
            className="w-full mb-3 rounded-lg bg-ink border border-line px-3 py-2"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
          >
            <option value="PM">زمان‌بندی‌شده (PM)</option>
            <option value="CBM">بر اساس وضعیت (CBM)</option>
          </select>
          <label className="text-xs text-muted">تکرار (روز)</label>
          <input
            type="number"
            className="w-full mb-3 mt-1 rounded-lg bg-ink border border-line px-3 py-2"
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(Number(e.target.value))}
          />
          <label className="text-xs text-muted">برآورد مدت اجرا (ساعت) — ورودی زمان‌بندی خودکار</label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="w-full mb-4 mt-1 rounded-lg bg-ink border border-line px-3 py-2"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Number(e.target.value))}
          />
          <button className="w-full rounded-lg bg-brass text-ink py-2 font-medium">ثبت پیش‌نویس</button>
        </form>
      ) : (
        <p className="text-sm text-muted">مشاهدهٔ برنامه‌ها برای تکنسین آزاد است؛ تغییر وضعیت با برنامه‌ریز است.</p>
      )}
      <div className="space-y-4">
        {canEdit ? (
          <div className="rounded-2xl border border-line bg-panel p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">زمان‌بندی خودکار نت/TAR</p>
              <p className="text-xs text-muted mt-1">
                موتور heuristic برنامه‌های «تأییدشده» با ساعت برآوردی را بین تکنسین‌ها توزیع می‌کند (فوریت: معوق، سطح بحرانی، سررسید).
              </p>
              {scheduleMessage ? <p className="text-xs text-mint mt-1">{scheduleMessage}</p> : null}
            </div>
            <button
              onClick={() => void runScheduler()}
              disabled={scheduling}
              className="shrink-0 rounded-lg bg-brass text-ink px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {scheduling ? 'در حال زمان‌بندی…' : 'زمان‌بندی خودکار'}
            </button>
          </div>
        ) : null}
        <div className="rounded-2xl border border-line bg-panel p-5">
          {plans.length === 0 ? <p className="text-muted text-sm">برنامه‌ای ثبت نشده است.</p> : null}
          {plans.map((plan) => (
            <div key={plan.id} className="border-b border-line py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-brass">{plan.equipment.tagNumber}</p>
                <p className="text-sm text-muted">
                  {plan.planType} · {statusLabel[plan.status] ?? plan.status}
                  {plan.frequencyDays ? ` · هر ${plan.frequencyDays} روز` : ''}
                  {plan.nextDueAt ? ` · سررسید بعدی: ${dateTime(plan.nextDueAt, false)}` : ''}
                </p>
                {plan.assignedTo && plan.scheduledStart ? (
                  <p className="text-xs text-brass mt-1">
                    زمان‌بندی‌شده: {plan.assignedTo.fullName} · {dateTime(plan.scheduledStart)}
                    {plan.scheduledEnd ? ` تا ${dateTime(plan.scheduledEnd)}` : ''}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  {plan.status === 'draft' ? (
                    <button onClick={() => void setStatus(plan.id, 'submitted')} className="text-sm">ارسال</button>
                  ) : null}
                  {plan.status === 'submitted' ? (
                    <>
                      <button onClick={() => void setStatus(plan.id, 'approved')} className="text-sm text-mint">تأیید</button>
                      <button onClick={() => void setStatus(plan.id, 'rejected')} className="text-sm text-rust">رد</button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
