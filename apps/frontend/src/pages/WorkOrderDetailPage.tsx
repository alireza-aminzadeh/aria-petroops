import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { priorityLabel, statusLabel } from '../lib/labels';

type Detail = {
  id: string;
  status: string;
  description: string;
  priority: string;
  rejectionReason?: string;
  availableEvents: string[];
  equipment: { tagNumber: string; name: string };
  assignedTo?: { fullName: string };
};

type UserOption = { id: string; fullName: string; roles: string[] };

type AuditRow = {
  id: string;
  action: string;
  hash: string;
  createdAt: string;
  actor?: { fullName: string; username: string } | null;
};

const eventLabel: Record<string, string> = {
  ASSIGN: 'واگذاری',
  START: 'شروع کار',
  SUBMIT_FOR_APPROVAL: 'ارسال برای تأیید',
  APPROVE: 'تأیید',
  REJECT: 'رد',
  CLOSE: 'بستن',
  CANCEL: 'لغو',
};

export function WorkOrderDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Detail | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const [detail, list, trail] = await Promise.all([
      api<Detail>(`/work-orders/${id}`),
      api<UserOption[]>('/auth/users'),
      api<AuditRow[]>(`/work-orders/${id}/audit`),
    ]);
    setItem(detail);
    const technicians = list.filter(
      (user) => user.roles.includes('TECHNICIAN') || user.roles.includes('ADMIN'),
    );
    setUsers(technicians.length ? technicians : list);
    setAudit(trail);
    if (!technicianId && (technicians[0] || list[0])) {
      setTechnicianId((technicians[0] ?? list[0]).id);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function send(type: string) {
    if (!id) return;
    setError(null);
    try {
      const body: Record<string, string> = { type };
      if (type === 'ASSIGN') body.technicianId = technicianId;
      if (type === 'REJECT') body.reason = reason;
      await api(`/work-orders/${id}/events`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'گذار ناموفق');
    }
  }

  if (!item) return <p>در حال بارگذاری…</p>;

  return (
    <section className="max-w-3xl">
      <p className="text-brass font-mono">{item.equipment.tagNumber}</p>
      <h2 className="text-2xl font-semibold mt-1">{item.description}</h2>
      <p className="text-muted mt-2">
        وضعیت: {statusLabel[item.status]} · اولویت: {priorityLabel[item.priority] ?? item.priority}
        {item.assignedTo ? ` · مسئول: ${item.assignedTo.fullName}` : ''}
      </p>
      {item.rejectionReason ? (
        <p className="text-rust mt-3">علت رد: {item.rejectionReason}</p>
      ) : null}
      {error ? <p className="text-rust mt-3">{error}</p> : null}
      <div className="flex flex-wrap gap-2 mt-6">
        {item.availableEvents.map((event) => (
          <button
            key={event}
            onClick={() => void send(event)}
            className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm hover:border-brass"
          >
            {eventLabel[event] ?? event}
          </button>
        ))}
        {item.availableEvents.length === 0 ? (
          <p className="text-muted text-sm">این دستور کار در وضعیت پایانی است.</p>
        ) : null}
      </div>
      {item.availableEvents.includes('ASSIGN') ? (
        <select
          className="mt-4 w-full rounded-lg bg-ink border border-line px-3 py-2"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
      ) : null}
      {item.availableEvents.includes('REJECT') ? (
        <input
          className="mt-4 w-full rounded-lg bg-ink border border-line px-3 py-2"
          placeholder="علت رد"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      ) : null}

      <h3 className="mt-10 mb-3 font-medium">مسیر ممیزی</h3>
      <ol className="rounded-2xl border border-line bg-panel divide-y divide-line/70">
        {audit.length === 0 ? (
          <li className="p-4 text-sm text-muted">هنوز رویدادی ثبت نشده است.</li>
        ) : (
          audit.map((row) => (
            <li key={row.id} className="p-4 text-sm flex justify-between gap-4">
              <div>
                <p>{eventLabel[row.action] ?? row.action}</p>
                <p className="text-muted text-xs mt-1">
                  {row.actor?.fullName ?? 'سامانه'} · {new Date(row.createdAt).toLocaleString('fa-IR')}
                </p>
              </div>
              <code className="text-[10px] text-muted font-mono self-center">
                {row.hash.slice(0, 12)}
              </code>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
