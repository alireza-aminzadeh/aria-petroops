import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useDateFormat } from '../lib/date';

type Dashboard = {
  hours: number;
  disclaimer: string;
  summary: { co2eKg: number; flareRatio: number; byKind: Record<string, number> };
  meters: {
    id: string;
    code: string;
    name: string;
    kind: string;
    unitOfMeasure: string;
    latest: number;
    co2eKg: number;
  }[];
};

export function EnergyPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { number } = useDateFormat();

  useEffect(() => {
    api<Dashboard>('/energy/dashboard?hours=24')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'خواندن انرژی ناموفق'));
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">انرژی و انتشارات</h2>
        <p className="text-muted text-sm mt-1">
          تراز ۲۴ ساعت اخیر واحد تقطیر نمونه. {data?.disclaimer}
        </p>
      </div>
      {error ? <p className="text-rust text-sm">{error}</p> : null}
      {data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-muted">CO2e تخمینی</p>
              <p className="text-2xl font-semibold mt-1">{number(Math.round(data.summary.co2eKg))} kg</p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-muted">نسبت فلر به گاز</p>
              <p className="text-2xl font-semibold mt-1">{(data.summary.flareRatio * 100).toFixed(1)}٪</p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-muted">گاز سوخت (میانگین)</p>
              <p className="text-2xl font-semibold mt-1">{(data.summary.byKind.fuel_gas ?? 0).toFixed(0)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-panel-2 text-muted">
                <tr>
                  <th className="text-right p-3">کنتور</th>
                  <th className="text-right p-3">نوع</th>
                  <th className="text-right p-3">آخرین مقدار</th>
                  <th className="text-right p-3">CO2e (۲۴س)</th>
                </tr>
              </thead>
              <tbody>
                {data.meters.map((meter) => (
                  <tr key={meter.id} className="border-t border-line">
                    <td className="p-3">{meter.name}</td>
                    <td className="p-3">{meter.kind}</td>
                    <td className="p-3 font-mono">
                      {meter.latest.toFixed(1)} {meter.unitOfMeasure}
                    </td>
                    <td className="p-3">{number(Math.round(meter.co2eKg))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
