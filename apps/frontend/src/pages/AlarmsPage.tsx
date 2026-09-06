import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useDateFormat } from '../lib/date';

type Kpis = {
  averagePer10Min: number;
  peakPer10Min: number;
  flood: boolean;
  standingCount: number;
  chatteringTagIds: string[];
};

type Alarm = {
  id: string;
  alarmType: string;
  priority: string;
  state: string;
  message: string;
  value: number;
  startedAt: string;
  equipment?: { tagNumber: string };
  tag?: { tagName: string };
};

export function AlarmsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [items, setItems] = useState<Alarm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { dateTime } = useDateFormat();

  useEffect(() => {
    Promise.all([api<Kpis>('/alarms/kpis?hours=8'), api<Alarm[]>('/alarms')])
      .then(([kpi, rows]) => {
        setKpis(kpi);
        setItems(rows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'خواندن آلارم ناموفق'));
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">تحلیل آلارم ISA-18.2</h2>
        <p className="text-muted text-sm mt-1">
          KPI از عبور حد تگ‌ها در هشت ساعت اخیر. هدف پایدار: حدود یک آلارم در ده دقیقه.
        </p>
      </div>
      {error ? <p className="text-rust text-sm">{error}</p> : null}
      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="میانگین / ۱۰ دقیقه" value={kpis.averagePer10Min.toFixed(2)} />
          <Kpi label="اوج ۱۰ دقیقه" value={String(kpis.peakPer10Min)} />
          <Kpi label="Flood" value={kpis.flood ? 'بله' : 'خیر'} warn={kpis.flood} />
          <Kpi label="ایستاده" value={String(kpis.standingCount)} />
        </div>
      ) : null}
      {kpis?.chatteringTagIds.length ? (
        <p className="text-sm text-rust">Chattering: {kpis.chatteringTagIds.length} تگ</p>
      ) : null}
      <div className="rounded-2xl border border-line bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-muted bg-panel-2">
            <tr>
              <th className="text-right p-3">تگ</th>
              <th className="text-right p-3">نوع</th>
              <th className="text-right p-3">اولویت</th>
              <th className="text-right p-3">وضعیت</th>
              <th className="text-right p-3">پیام</th>
              <th className="text-right p-3">شروع</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="p-3 font-mono">{item.tag?.tagName ?? item.equipment?.tagNumber}</td>
                <td className="p-3">{item.alarmType}</td>
                <td className="p-3">{item.priority}</td>
                <td className="p-3">{item.state}</td>
                <td className="p-3 text-muted">{item.message}</td>
                <td className="p-3 text-xs text-muted whitespace-nowrap">{dateTime(item.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <p className="p-4 text-muted text-sm">آلارم فعالی در فهرست نیست.</p> : null}
      </div>
    </section>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? 'border-rust bg-rust/10' : 'border-line bg-panel'}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl mt-1 font-semibold">{value}</p>
    </div>
  );
}
