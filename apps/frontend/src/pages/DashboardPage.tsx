import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { api, hasRole } from '../lib/api';
import { connectTelemetry, TagUpdate } from '../lib/ws';

type Tag = { id: string; tagName: string; unitOfMeasure: string };
type Reading = { time: string; value: number };

export function DashboardPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagId, setTagId] = useState('');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mqtt, setMqtt] = useState<string>('disabled');
  const [live, setLive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canImport = hasRole('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER');

  useEffect(() => {
    api<Tag[]>('/tags').then((data) => {
      setTags(data);
      setTagId((current) => current || data[0]?.id || '');
    });
    fetch('/health')
      .then((res) => res.json())
      .then((body: { mqtt?: string }) => setMqtt(body.mqtt ?? 'disabled'))
      .catch(() => setMqtt('unknown'));
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    chartInstance.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tagId) return;
    api<Reading[]>(`/telemetry/readings?tagId=${tagId}`)
      .then(setReadings)
      .catch((err) => setError(err instanceof Error ? err.message : 'خواندن داده ناموفق'));
  }, [tagId, refreshKey]);

  useEffect(() => {
    const selected = tags.find((t) => t.id === tagId);
    chartInstance.current?.setOption({
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Vazirmatn Variable' },
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 48 },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#8aa3a6' } },
      },
      yAxis: {
        type: 'value',
        name: selected?.unitOfMeasure,
        axisLine: { lineStyle: { color: '#8aa3a6' } },
        splitLine: { lineStyle: { color: '#2a4a50' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: readings.length < 24,
          data: readings.map((r) => [r.time, r.value]),
          lineStyle: { color: '#d4a017', width: 2 },
          areaStyle: { color: 'rgba(212,160,23,0.12)' },
        },
      ],
    });
  }, [readings, tags, tagId]);

  useEffect(() => {
    const socket = connectTelemetry((payload: TagUpdate) => {
      if (payload.tagId !== tagId) return;
      setReadings((prev) => [
        ...prev,
        { time: payload.timestamp, value: payload.value },
      ]);
    });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', () => setLive(false));
    return () => {
      socket.disconnect();
    };
  }, [tagId]);

  async function importCsv() {
    if (!file) return;
    setError(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api<{ imported: number }>('/telemetry/csv-import', {
        method: 'POST',
        body,
      });
      setMessage(`${result.imported} نمونه وارد شد و روی WebSocket پخش شد.`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود CSV ناموفق بود.');
    }
  }

  return (
    <section>
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">داشبورد تله‌متری</h2>
          <p className="text-muted text-sm mt-1">
            دادهٔ زنده از MQTT (Edge Agent) وارد Timescale می‌شود؛ CSV همچنان برای Historian دستی است.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`text-xs rounded-full px-3 py-1 ${
              mqtt === 'up' ? 'bg-mint/20 text-mint' : 'bg-panel-2 text-muted'
            }`}
          >
            MQTT {mqtt}
          </span>
          <span
            className={`text-xs rounded-full px-3 py-1 ${
              live ? 'bg-mint/20 text-mint' : 'bg-panel-2 text-muted'
            }`}
          >
            {live ? 'WebSocket متصل' : 'WebSocket قطع'}
          </span>
          <a
            href="/sample-readings.csv"
            download
            className="text-sm text-brass hover:underline"
          >
            دانلود CSV نمونه
          </a>
          {canImport ? (
            <>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => void importCsv()}
                className="rounded-lg bg-brass text-ink px-4 py-2 text-sm font-medium"
              >
                ورود CSV
              </button>
            </>
          ) : null}
        </div>
      </header>
      {message ? <p className="text-mint text-sm mb-4">{message}</p> : null}
      {error ? <p className="text-rust text-sm mb-4">{error}</p> : null}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <select
          className="bg-ink border border-line rounded-lg px-3 py-2 text-sm mb-4"
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
        >
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.tagName}
            </option>
          ))}
        </select>
        <div ref={chartRef} className="h-[420px] w-full" />
        {readings.length === 0 ? (
          <p className="text-muted text-sm mt-2">هنوز نمونه‌ای برای این تگ نیست. CSV نمونه را وارد کنید.</p>
        ) : null}
      </div>
    </section>
  );
}
