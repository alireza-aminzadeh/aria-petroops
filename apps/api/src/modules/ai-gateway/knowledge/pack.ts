export type KnowledgeDoc = {
  id: string;
  title: string;
  citation: string;
  text: string;
};

export const KNOWLEDGE_PACK: KnowledgeDoc[] = [
  {
    id: 'isa-18-2',
    title: 'ISA-18.2 — مدیریت آلارم',
    citation: 'ISA-18.2 / IEC 62682 (Alarm Management)',
    text: `نرخ آلارم هدف برای یک اپراتور حدود یک آلارم در ده دقیقه در شرایط پایدار است. بیش از ده آلارم در ده دقیقه flood محسوب می‌شود. chattering یعنی یک آلارم در کمتر از یک دقیقه چند بار فعال و پاک شود و باید فیلتر یا deadband شود. آلارم‌های ایستاده (standing) باید به‌صورت دوره‌ای بازنگری شوند. پتروپایش این KPIها را از روی عبور حد تگ محاسبه می‌کند.`,
  },
  {
    id: 'iso-10816',
    title: 'ارتعاش تجهیزات دوار',
    citation: 'ISO 10816-3 Group 2 (small machines on rigid foundations)',
    text: `برای پمپ‌های کوچک روی فونداسیون صلب، ناحیه A معمولاً زیر حدود ۲.۳ mm/s RMS، ناحیه B تا ۴.۵، ناحیه C تا ۷.۱ و بالاتر ناحیه D (غیرقابل قبول) است. افزایش هم‌زمان دمای یاتاقان و ارتعاش نشانهٔ عیب بیرینگ یا ناهم‌محوری است و باید دستور کار CBM صادر شود.`,
  },
  {
    id: 'api-610',
    title: 'پمپ سانتریفیوژ پالایشگاهی',
    citation: 'API 610 (centrifugal pumps) — guidance, not a substitute for the standard text',
    text: `پمپ خوراک تقطیر (مانند P-101) تجهیز بحرانی است. نشت آب‌بند مکانیکی، افزایش دمای یاتاقان، و رشد ارتعاش از نشانه‌های رایج توقف برنامه‌نشده هستند. حد فشار تخلیه باید با منحنی پمپ و کنترل سطح ستون هماهنگ باشد.`,
  },
  {
    id: 'flare-ghg',
    title: 'فلرینگ و حساب کربن',
    citation: 'IPCC / engineering default factors (site calibration required)',
    text: `شدت انرژی واحد برابر است با انرژی ورودی (برق + گاز سوخت) نسبت به خوراک یا بخار مفید. فلرینگ باید جداگانه پایش شود؛ ضریب انتشار پیش‌فرض سامانه فقط برای دمو است و ادعای انطباق زیست‌محیطی نیست. کاهش فلر معمولاً با بازیابی گاز و پایداری کوره حاصل می‌شود.`,
  },
  {
    id: 'tep-method',
    title: 'آنومالی چندمتغیره فرآیندی',
    citation: 'Tennessee Eastman Process (Downs & Vogel, 1993) method analogue; Isolation Forest baseline',
    text: `مدل فعلی پتروپایش Isolation Forest روی پنجرهٔ چندتگ است (همان baseline پروژهٔ RefineryGuard). LSTM-AE روی TEP در Hugging Face به‌عنوان POC جدا منتشر شده و روی این سرور ۲ vCPU سرو نمی‌شود. آستانه‌ها باید با دادهٔ Historian مشتری در پایلوت کالیبره شوند.`,
  },
];

export function retrieveKnowledge(query: string, limit = 2): KnowledgeDoc[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return KNOWLEDGE_PACK.slice(0, limit);
  }
  return KNOWLEDGE_PACK.map((doc) => ({
    doc,
    score: tokens.reduce((sum, token) => {
      const hay = `${doc.title} ${doc.text} ${doc.citation}`.toLowerCase();
      return sum + (hay.includes(token) ? 1 : 0);
    }, 0),
  }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.doc);
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}
