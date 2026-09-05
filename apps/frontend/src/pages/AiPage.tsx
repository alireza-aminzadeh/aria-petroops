import { FormEvent, useEffect, useState } from 'react';
import { api, hasRole } from '../lib/api';

type AiStatus = { enabled: boolean; available: boolean; message: string; method?: string };
type AnomalyEvent = {
  id: string;
  score: number | null;
  status: string;
  summary: string | null;
  method: string;
  detectedAt: string;
  equipment?: { tagNumber: string; name: string };
};

type Answer = { available: boolean; text?: string | null; citations?: string[]; message?: string | null };

export function AiPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [anomalyQuery, setAnomalyQuery] = useState('چرا ارتعاش P-101 بالا رفته است؟');
  const [knowledgeQuery, setKnowledgeQuery] = useState('حدود ارتعاش مجاز پمپ سانتریفیوژ طبق ISO چیست؟');
  const [anomalyMessage, setAnomalyMessage] = useState('');
  const [knowledgeMessage, setKnowledgeMessage] = useState('');
  const [citations, setCitations] = useState<string[]>([]);
  const canAct = hasRole('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER');

  async function load() {
    const [st, list] = await Promise.all([
      api<AiStatus>('/ai/status'),
      api<{ items: AnomalyEvent[] }>('/anomaly-events'),
    ]);
    setStatus(st);
    setEvents(list.items);
  }

  useEffect(() => {
    void load().catch(() => {
      setStatus({
        enabled: false,
        available: false,
        message: 'سرویس AI در دسترس نیست.',
      });
    });
  }, []);

  async function submit(
    event: FormEvent,
    path: string,
    query: string,
    setMessage: (value: string) => void,
  ) {
    event.preventDefault();
    try {
      const result = await api<Answer>(path, {
        method: 'POST',
        body: JSON.stringify({ query, eventId: events[0]?.id }),
      });
      setMessage(result.text ?? result.message ?? '');
      setCitations(result.citations ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'سرویس در دسترس نیست.');
    }
  }

  async function ack(id: string) {
    await api(`/anomaly-events/${id}/acknowledge`, { method: 'POST', body: '{}' });
    await load();
  }

  async function wo(id: string) {
    await api(`/anomaly-events/${id}/work-order`, { method: 'POST', body: '{}' });
    await load();
  }

  return (
    <section className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">سلامت دارایی و دستیار</h2>
        <p className="text-muted text-sm mt-2">{status?.message}</p>
        {status?.method ? (
          <p className="text-xs text-brass mt-1 font-mono">{status.method}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 space-y-3">
        <h3 className="font-medium">رویدادهای آنومالی (Isolation Forest)</h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted">هنوز رویدادی باز نیست. تله‌متری زنده باید چند دقیقه داده جمع کند.</p>
        ) : (
          events.slice(0, 8).map((item) => (
            <article key={item.id} className="border border-line rounded-xl p-3 flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-medium">{item.equipment?.tagNumber ?? 'تجهیز'} — {item.status}</p>
                <p className="text-sm text-muted mt-1">{item.summary}</p>
                <p className="text-xs text-brass mt-1">امتیاز {item.score?.toFixed(2) ?? '—'}</p>
              </div>
              {canAct && item.status === 'open' ? (
                <div className="flex gap-2">
                  <button className="text-sm border border-line rounded-lg px-3 py-1" onClick={() => void ack(item.id)}>
                    تأیید دیده‌شدن
                  </button>
                  <button className="text-sm bg-brass text-ink rounded-lg px-3 py-1" onClick={() => void wo(item.id)}>
                    دستور کار
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form
        onSubmit={(event) => void submit(event, '/ai/anomaly-explain', anomalyQuery, setAnomalyMessage)}
        className="rounded-2xl border border-line bg-panel p-6"
      >
        <h3 className="font-medium mb-3">توضیح آنومالی</h3>
        <textarea
          className="w-full rounded-lg bg-ink border border-line px-3 py-2 min-h-24"
          value={anomalyQuery}
          onChange={(e) => setAnomalyQuery(e.target.value)}
        />
        <button className="mt-4 rounded-lg bg-brass text-ink px-4 py-2 text-sm font-medium">توضیح بده</button>
        {anomalyMessage ? <p className="text-sm mt-4 whitespace-pre-wrap">{anomalyMessage}</p> : null}
      </form>

      <form
        onSubmit={(event) => void submit(event, '/ai/knowledge-query', knowledgeQuery, setKnowledgeMessage)}
        className="rounded-2xl border border-line bg-panel p-6"
      >
        <h3 className="font-medium mb-3">دانش فنی محلی (نه LLM)</h3>
        <textarea
          className="w-full rounded-lg bg-ink border border-line px-3 py-2 min-h-24"
          value={knowledgeQuery}
          onChange={(e) => setKnowledgeQuery(e.target.value)}
        />
        <button className="mt-4 rounded-lg border border-line px-4 py-2 text-sm">جستجو</button>
        {knowledgeMessage ? <p className="text-sm mt-4 whitespace-pre-wrap">{knowledgeMessage}</p> : null}
        {citations.length > 0 ? (
          <ul className="text-xs text-muted mt-3 list-disc pr-5">
            {citations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </form>
    </section>
  );
}
