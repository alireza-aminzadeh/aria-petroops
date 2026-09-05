import { FormEvent, useEffect, useState } from 'react';
import { api, hasRole } from '../lib/api';
import { statusLabel } from '../lib/labels';

type Plan = {
  id: string;
  planType: string;
  status: string;
  frequencyDays?: number;
  equipment: { tagNumber: string };
};

type Equipment = { id: string; tagNumber: string };

export function MaintenancePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [planType, setPlanType] = useState('PM');
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
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
        body: JSON.stringify({ equipmentId, planType, frequencyDays }),
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
          <input
            type="number"
            className="w-full mb-4 rounded-lg bg-ink border border-line px-3 py-2"
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(Number(e.target.value))}
          />
          <button className="w-full rounded-lg bg-brass text-ink py-2 font-medium">ثبت پیش‌نویس</button>
        </form>
      ) : (
        <p className="text-sm text-muted">مشاهدهٔ برنامه‌ها برای تکنسین آزاد است؛ تغییر وضعیت با برنامه‌ریز است.</p>
      )}
      <div className="rounded-2xl border border-line bg-panel p-5">
        {plans.length === 0 ? <p className="text-muted text-sm">برنامه‌ای ثبت نشده است.</p> : null}
        {plans.map((plan) => (
          <div key={plan.id} className="border-b border-line py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-brass">{plan.equipment.tagNumber}</p>
              <p className="text-sm text-muted">
                {plan.planType} · {statusLabel[plan.status] ?? plan.status}
                {plan.frequencyDays ? ` · هر ${plan.frequencyDays} روز` : ''}
              </p>
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
    </section>
  );
}
