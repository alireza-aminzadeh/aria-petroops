import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, hasRole } from '../lib/api';
import { priorityLabel, statusLabel } from '../lib/labels';

type WorkOrder = {
  id: string;
  status: string;
  priority: string;
  description: string;
  equipment: { tagNumber: string; name: string };
};

type Equipment = { id: string; tagNumber: string; name: string };

export function WorkOrdersPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasRole('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER');

  async function load() {
    const [orders, assets] = await Promise.all([
      api<WorkOrder[]>('/work-orders'),
      api<Equipment[]>('/equipment'),
    ]);
    setItems(orders);
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
      await api('/work-orders', {
        method: 'POST',
        body: JSON.stringify({ equipmentId, description, priority }),
      });
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت ناموفق');
    }
  }

  return (
    <section className="grid lg:grid-cols-[20rem_1fr] gap-6">
      {canCreate ? (
      <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-5 h-fit">
        <h3 className="font-medium mb-4">دستور کار جدید</h3>
        <label className="text-sm" htmlFor="wo-equipment">تجهیز</label>
        <select
          id="wo-equipment"
          className="w-full mt-1 mb-3 rounded-lg bg-ink border border-line px-3 py-2"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
        >
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.tagNumber} — {item.name}
            </option>
          ))}
        </select>
        <label className="text-sm" htmlFor="wo-priority">اولویت</label>
        <select
          id="wo-priority"
          className="w-full mt-1 mb-3 rounded-lg bg-ink border border-line px-3 py-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">کم</option>
          <option value="medium">متوسط</option>
          <option value="high">زیاد</option>
          <option value="critical">بحرانی</option>
        </select>
        <label className="text-sm" htmlFor="wo-desc">شرح</label>
        <textarea
          id="wo-desc"
          className="w-full mt-1 rounded-lg bg-ink border border-line px-3 py-2 min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        {error ? <p className="text-rust text-sm mt-2">{error}</p> : null}
        <button className="mt-4 w-full rounded-lg bg-brass text-ink py-2 font-medium">
          ایجاد پیش‌نویس
        </button>
      </form>
      ) : (
        <div className="rounded-2xl border border-line bg-panel p-5 h-fit text-sm text-muted">
          ایجاد دستور کار فقط برای برنامه‌ریز نت است. شما می‌توانید دستورهای واگذارشده را اجرا کنید.
        </div>
      )}
      <div className="rounded-2xl border border-line bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-muted">
            <tr>
              <th className="text-right p-3">تجهیز</th>
              <th className="text-right">شرح</th>
              <th className="text-right">وضعیت</th>
              <th className="text-right">اولویت</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line/70">
                <td className="p-3 font-mono text-brass">{item.equipment.tagNumber}</td>
                <td>
                  <Link className="hover:text-brass" to={`/work-orders/${item.id}`}>
                    {item.description}
                  </Link>
                </td>
                <td>{statusLabel[item.status] ?? item.status}</td>
                <td>{priorityLabel[item.priority] ?? item.priority}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="p-4 text-muted" colSpan={4}>
                  هنوز دستور کاری ثبت نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
