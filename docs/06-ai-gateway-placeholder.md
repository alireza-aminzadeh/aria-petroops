# ۶) جای‌گذاری RAG/LLM و مدل‌های ML بدون پیاده‌سازی (AI Gateway Placeholder)

## ۶.۱ تصمیم صریح
مانند SafeOps: **بخش RAG/LLM و مدل‌های ML آنومالی/RUL در این فاز پیاده‌سازی نمی‌شوند**. جای آن در معماری، دیتابیس و UI کامل رزرو می‌شود.

## ۶.۲ رابط (Port) — قرارداد پایدار

```typescript
// apps/api/src/modules/ai-gateway/ai-gateway.port.ts
export interface AiGatewayPort {
  isEnabled(): boolean;

  /** توضیح متنی یک رویداد آنومالی برای اپراتور (فاز ۲) */
  explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer>;

  /** تخمین عمر باقی‌مانده (RUL) بر اساس سری‌زمانی سنسور (فاز ۲) */
  estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate>;

  /** پرسش عمومی از دانش فنی (اشتراکی با AI Gateway مرکزی SafeOps) */
  askKnowledgeBase(query: string, context?: Record<string, unknown>): Promise<AiAnswer>;
}

export class AiAnswer {
  private constructor(
    public readonly available: boolean,
    public readonly text: string | null,
    public readonly citations: string[],
    public readonly unavailableReason: string | null,
  ) {}

  static unavailable(reason: string): AiAnswer {
    return new AiAnswer(false, null, [], reason);
  }

  static from(text: string, citations: string[]): AiAnswer {
    return new AiAnswer(true, text, citations, null);
  }
}
```

## ۶.۳ پیاده‌سازی فعلی — Stub غیرفعال

```typescript
// apps/api/src/modules/ai-gateway/stub-ai-gateway.adapter.ts
@Injectable()
export class StubAiGatewayAdapter implements AiGatewayPort {
  isEnabled(): boolean {
    return false;
  }

  async explainAnomaly(): Promise<AiAnswer> {
    return AiAnswer.unavailable('سرویس تحلیل هوشمند آنومالی هنوز فعال نشده است.');
  }

  async estimateRemainingUsefulLife(): Promise<AiRulEstimate> {
    return AiRulEstimate.unavailable();
  }

  async askKnowledgeBase(): Promise<AiAnswer> {
    return AiAnswer.unavailable('سرویس دستیار دانش هنوز فعال نشده است.');
  }
}
```

Wiring در Module:
```typescript
@Module({
  providers: [
    // فاز فعلی: همیشه Stub. فاز بعد: بر اساس AI_GATEWAY_ENABLED به HttpAiGatewayAdapter تغییر می‌کند
    { provide: 'AiGatewayPort', useClass: StubAiGatewayAdapter },
  ],
  exports: ['AiGatewayPort'],
})
export class AiGatewayModule {}
```

## ۶.۴ نقاط اتصال UI (غیرفعال ولی موجود)
| مکان | رفتار فعلی |
|---|---|
| پنل «تحلیل هوشمند آنومالی» در صفحهٔ Asset Health | نمایش داده می‌شود با وضعیت «به‌زودی»؛ endpoint مربوطه `503` برمی‌گرداند |
| ستون «RUL تخمینی» در جدول تجهیزات | همیشه «—» تا فعال‌سازی مدل واقعی |
| دکمهٔ «پرسش از دستیار دانش فنی» | مشابه SafeOps، غیرفعال با پیام مشخص |

## ۶.۵ کانفیگ (از الان در `.env.example` موجود)
```
AI_GATEWAY_ENABLED=false
AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
AI_GATEWAY_TIMEOUT_MS=8000
```

## ۶.۶ جدول‌های دیتابیس از الان ساخته می‌شوند
`anomaly_events` و `ai_query_log` (جزئیات در [`04-database-schema.md`](04-database-schema.md)) — خالی/بلااستفاده در فاز ۱.

## ۶.۷ معماری هدف: یک AI Gateway مرکزی مشترک با SafeOps
```
┌───────────────────┐                       ┌───────────────────┐
│ PetroOps API       │──HTTP (internal)────▶│                    │
│ (این سرور،          │                       │  AI Gateway مرکزی   │
│ 91.107.149.251)     │◀──────────────────── │  (سرور/زیرساخت سوم │
└───────────────────┘                       │  جدا، مشترک)        │
                                             │  FastAPI + Qdrant +│
┌───────────────────┐                       │  LLM + مدل RUL/    │
│ SafeOps API         │──HTTP (internal)────▶│  Anomaly           │
│ (سرور دیگر،          │◀──────────────────── │                    │
│ 91.107.130.11)      │                       └───────────────────┘
└───────────────────┘
```
دلیل مرکزی‌بودن: مدل‌های embedding/LLM/آنومالی سنگین‌اند؛ سرو کردن دوبار (یک‌بار برای هر سامانه) منابع را هدر می‌دهد. هر دو بک‌اند (NestJS اینجا، Symfony در SafeOps) فقط یک HTTP client به همان سرویس مرکزی خواهند داشت.

## ۶.۸ چرا این‌طور طراحی شد
- **Dependency Inversion**: ماژول‌های دامنه (`work-order`, `asset`) فقط `AiGatewayPort` را می‌شناسند.
- **Open/Closed**: افزودن `HttpAiGatewayAdapter` در آینده نیازی به تغییر Controller/Service مصرف‌کننده ندارد.
- **تست‌پذیری**: در تست‌های Jest، `StubAiGatewayAdapter` یا یک mock جای‌گزین آن می‌شود بدون نیاز به سرویس واقعی.
