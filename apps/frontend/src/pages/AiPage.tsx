import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

type AiStatus = { enabled: boolean; available: boolean; message: string };

export function AiPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [anomalyQuery, setAnomalyQuery] = useState('چرا ارتعاش P-101 بالا رفته است؟');
  const [knowledgeQuery, setKnowledgeQuery] = useState('حدود ارتعاش مجاز پمپ سانتریفیوژ طبق API چیست؟');
  const [anomalyMessage, setAnomalyMessage] = useState('سرویس تحلیل هوشمند هنوز فعال نشده است.');
  const [knowledgeMessage, setKnowledgeMessage] = useState('سرویس دستیار دانش هنوز فعال نشده است.');

  useEffect(() => {
    api<AiStatus>('/ai/status')
      .then(setStatus)
      .catch(() => {
        setStatus({
          enabled: false,
          available: false,
          message: 'سرویس AI Gateway مرکزی هنوز فعال نشده است.',
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
      await api(path, {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'سرویس در دسترس نیست.');
    }
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">دستیار هوشمند</h2>
        <p className="text-muted text-sm mt-2">
          {status?.message ?? 'جای این قابلیت رزرو شده است. در فاز ۲ به AI Gateway مرکزی وصل می‌شود.'}
        </p>
      </div>
      <form
        onSubmit={(event) => void submit(event, '/ai/anomaly-explain', anomalyQuery, setAnomalyMessage)}
        className="rounded-2xl border border-dashed border-brass/50 bg-panel p-6"
      >
        <span className="inline-block text-xs bg-brass text-ink rounded-full px-3 py-1 mb-4">به‌زودی</span>
        <h3 className="font-medium mb-3">تحلیل هوشمند آنومالی</h3>
        <textarea
          className="w-full rounded-lg bg-ink border border-line px-3 py-2 min-h-24"
          value={anomalyQuery}
          onChange={(e) => setAnomalyQuery(e.target.value)}
        />
        <button className="mt-4 rounded-lg border border-line px-4 py-2 text-sm">ارسال آزمایشی</button>
        <p className="text-rust text-sm mt-4">{anomalyMessage}</p>
      </form>
      <form
        onSubmit={(event) => void submit(event, '/ai/knowledge-query', knowledgeQuery, setKnowledgeMessage)}
        className="rounded-2xl border border-dashed border-brass/50 bg-panel p-6"
      >
        <span className="inline-block text-xs bg-brass text-ink rounded-full px-3 py-1 mb-4">به‌زودی</span>
        <h3 className="font-medium mb-3">پرسش از دستیار دانش فنی</h3>
        <textarea
          className="w-full rounded-lg bg-ink border border-line px-3 py-2 min-h-24"
          value={knowledgeQuery}
          onChange={(e) => setKnowledgeQuery(e.target.value)}
        />
        <button className="mt-4 rounded-lg border border-line px-4 py-2 text-sm">ارسال آزمایشی</button>
        <p className="text-rust text-sm mt-4">{knowledgeMessage}</p>
      </form>
    </section>
  );
}
