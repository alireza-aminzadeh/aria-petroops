# ۶) AI Gateway — on-prem فاز ۲ + مسیر سرویس مرکزی

## ۶.۱ تصمیم فاز ۲
روی سرور ۲ vCPU **LSTM-AE/PyTorch سرو نمی‌شود**. پیش‌فرض: `OnPremAiGatewayAdapter` (Isolation Forest + RUL مهندسی + بستهٔ دانش محلی). اگر `AI_GATEWAY_URL` ست شود، `HttpAiGatewayAdapter` به سرویس مرکزی FastAPI (LSTM-AE/RefineryGuard) وصل می‌شود. RAG/LLM همچنان خارج از این سرور است.

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

Wiring در Module: اگر `AI_GATEWAY_ENABLED=false` باشد Stub؛ اگر `AI_GATEWAY_URL` پر باشد Http؛ در غیر این صورت OnPrem (Isolation Forest).

## ۶.۴ نقاط اتصال UI
| مکان | رفتار فاز ۲ |
|---|---|
| پنل آنومالی | فهرست رویدادهای Isolation Forest + توضیح |
| ستون RUL تجهیزات | تخمین روز باقی‌مانده + شاخص سلامت |
| دستیار دانش | جستجوی بستهٔ محلی ISA-18.2 / ISO 10816 / فلر |

## ۶.۵ کانفیگ
```
AI_GATEWAY_ENABLED=true
AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
AI_GATEWAY_TIMEOUT_MS=8000
```

## ۶.۶ جدول‌های دیتابیس
`anomaly_events`، `alarm_events`، `energy_meters`، `energy_readings`، `integration_deliveries`

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
