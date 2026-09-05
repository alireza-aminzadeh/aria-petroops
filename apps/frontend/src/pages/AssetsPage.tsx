import { FormEvent, useEffect, useState } from 'react';
import { api, hasRole } from '../lib/api';
import { classLabel } from '../lib/labels';

type Site = { id: string; name: string; location?: string };
type Unit = { id: string; name: string; processType: string; siteId: string };
type Equipment = {
  id: string;
  tagNumber: string;
  name: string;
  equipmentClass: string;
  criticality: string;
  unitId: string;
  tags: { tagName: string; unitOfMeasure: string }[];
};

export function AssetsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [unitId, setUnitId] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [name, setName] = useState('');
  const [equipmentClass, setEquipmentClass] = useState('pump');
  const [criticality, setCriticality] = useState('high');
  const [tagEquipmentId, setTagEquipmentId] = useState('');
  const [tagName, setTagName] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('bar');
  const [rul, setRul] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const canEdit = hasRole('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER');

  async function load() {
    const [siteRows, unitRows, equipmentRows] = await Promise.all([
      api<Site[]>('/sites'),
      api<Unit[]>('/units'),
      api<Equipment[]>('/equipment'),
    ]);
    setSites(siteRows);
    setUnits(unitRows);
    setEquipment(equipmentRows);
    if (!unitId && unitRows[0]) setUnitId(unitRows[0].id);
    if (!tagEquipmentId && equipmentRows[0]) setTagEquipmentId(equipmentRows[0].id);
    for (const item of equipmentRows.slice(0, 8)) {
      api<{ available: boolean; remainingDays?: number; healthIndex?: number }>(
        `/ai/rul?equipmentId=${item.id}`,
      )
        .then((result) => {
          if (!result.available || result.remainingDays == null) return;
          setRul((prev) => ({
            ...prev,
            [item.id]: `${result.remainingDays} روز · HI ${result.healthIndex ?? '—'}`,
          }));
        })
        .catch(() => undefined);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createEquipment(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/equipment', {
        method: 'POST',
        body: JSON.stringify({ unitId, tagNumber, name, equipmentClass, criticality }),
      });
      setTagNumber('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تجهیز ناموفق');
    }
  }

  async function createTag(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/tags', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: tagEquipmentId,
          tagName,
          unitOfMeasure,
          dataType: 'numeric',
        }),
      });
      setTagName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت تگ ناموفق');
    }
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold">سلسله‌مراتب دارایی</h2>
      <p className="text-muted text-sm mt-1 mb-6">سایت → واحد → تجهیز → تگ</p>
      {error ? <p className="text-rust text-sm mb-4">{error}</p> : null}
      {canEdit ? (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <form onSubmit={createEquipment} className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="font-medium mb-3">تجهیز جدید</h3>
            <select className="w-full mb-2 rounded-lg bg-ink border border-line px-3 py-2" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <input className="w-full mb-2 rounded-lg bg-ink border border-line px-3 py-2" placeholder="شماره تگ (P-102)" value={tagNumber} onChange={(e) => setTagNumber(e.target.value)} required />
            <input className="w-full mb-2 rounded-lg bg-ink border border-line px-3 py-2" placeholder="نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select className="rounded-lg bg-ink border border-line px-3 py-2" value={equipmentClass} onChange={(e) => setEquipmentClass(e.target.value)}>
                <option value="pump">پمپ</option>
                <option value="compressor">کمپرسور</option>
                <option value="turbine">توربین</option>
                <option value="other">سایر</option>
              </select>
              <select className="rounded-lg bg-ink border border-line px-3 py-2" value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                <option value="low">کم</option>
                <option value="medium">متوسط</option>
                <option value="high">زیاد</option>
                <option value="critical">بحرانی</option>
              </select>
            </div>
            <button className="w-full rounded-lg bg-brass text-ink py-2 text-sm font-medium">ثبت تجهیز</button>
          </form>
          <form onSubmit={createTag} className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="font-medium mb-3">تگ سنسور جدید</h3>
            <select className="w-full mb-2 rounded-lg bg-ink border border-line px-3 py-2" value={tagEquipmentId} onChange={(e) => setTagEquipmentId(e.target.value)}>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>{item.tagNumber}</option>
              ))}
            </select>
            <input className="w-full mb-2 rounded-lg bg-ink border border-line px-3 py-2" placeholder="P-101.SUCTION_PRESSURE" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
            <input className="w-full mb-3 rounded-lg bg-ink border border-line px-3 py-2" placeholder="واحد (bar)" value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} required />
            <button className="w-full rounded-lg bg-brass text-ink py-2 text-sm font-medium">ثبت تگ</button>
          </form>
        </div>
      ) : null}
      <div className="grid gap-4">
        {sites.map((site) => (
          <article key={site.id} className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="text-lg">{site.name}</h3>
            <p className="text-muted text-sm">{site.location}</p>
            <div className="mt-4 grid gap-3">
              {units
                .filter((unit) => unit.siteId === site.id)
                .map((unit) => (
                  <div key={unit.id} className="rounded-xl bg-panel-2 p-4">
                    <p className="font-medium">{unit.name}</p>
                    <p className="text-xs text-muted">{unit.processType}</p>
                    <table className="w-full mt-3 text-sm">
                      <thead className="text-muted">
                        <tr>
                          <th className="text-right py-1">تگ</th>
                          <th className="text-right">نام</th>
                          <th className="text-right">کلاس</th>
                          <th className="text-right">بحرانی بودن</th>
                          <th className="text-right">RUL تخمینی</th>
                          <th className="text-right">سنسورها</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment
                          .filter((item) => item.unitId === unit.id)
                          .map((item) => (
                            <tr key={item.id} className="border-t border-line/70 align-top">
                              <td className="py-2 font-mono text-brass">{item.tagNumber}</td>
                              <td>{item.name}</td>
                              <td>{classLabel[item.equipmentClass] ?? item.equipmentClass}</td>
                              <td>{item.criticality}</td>
                              <td className="text-muted">{rul[item.id] ?? '—'}</td>
                              <td className="text-muted text-xs">
                                {item.tags.map((tag) => tag.tagName).join('، ') || '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
