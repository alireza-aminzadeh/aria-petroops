# ۲) معماری — Aria PetroOps

## ۲.۱ الگوی کلی
**Modular Monolith** روی NestJS (ماژول‌های Nest = Bounded Context). مونوریپو **Turborepo + pnpm** برای اشتراک نوع (Type) بین بک‌اند و فرانت‌اند.

```
┌─────────────────────┐   HTTPS/JSON + WSS         ┌──────────────────────────┐
│  React 19 + TS SPA   │ ─────────────────────────▶│  Nginx (reverse proxy +  │
│  (Vite build)        │◀───────────────────────── │  WebSocket upgrade)      │
└─────────────────────┘                            └───────────┬──────────────┘
                                                                │ HTTP + WS
                                                     ┌──────────▼──────────────┐
                                                     │  NestJS 11 (Fastify)    │
                                                     │  - AssetModule          │
                                                     │  - WorkOrderModule      │
                                                     │  - AnomalyModule (فاز۲) │
                                                     │  - EnergyModule (فاز۲)  │
                                                     │  - TelemetryGateway(WS) │
                                                     │  - AiGatewayModule(stub)│
                                                     └──┬───────────┬──────────┘
                                                        │           │
                                          ┌─────────────▼───┐   ┌───▼──────┐
                                          │ PostgreSQL 16 +  │   │  Redis 7 │
                                          │ TimescaleDB      │   │ (کش +    │
                                          │ (hypertable تگ)  │   │ BullMQ)  │
                                          └──────────────────┘   └──────────┘

                        (فاز ۲+، غیرفعال)          (آینده — سرویس مستقل، فاز ۲+)
                 ┌──────────────────────┐    ┌──────────────────────────┐
                 │ EMQX (MQTT Broker)   │    │ AI Gateway (FastAPI +    │
                 │ node-opcua / jsmodbus│    │ Qdrant + LLM + مدل RUL)  │
                 └──────────────────────┘    │ خارج از این سرور         │
                                              └──────────────────────────┘
```

## ۲.۲ ساختار مونوریپو (هدف فاز اسکلت‌سازی)

```
aria-petroops/
├── apps/
│   ├── api/                              ← NestJS 11
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── asset/                ← ISA-95: Site/Unit/Equipment/Tag
│   │   │   │   │   ├── entities/
│   │   │   │   │   ├── asset.controller.ts
│   │   │   │   │   └── asset.service.ts
│   │   │   │   ├── work-order/
│   │   │   │   │   ├── work-order.machine.ts   ← XState (بخش ۳)
│   │   │   │   │   ├── work-order.controller.ts
│   │   │   │   │   └── work-order.service.ts
│   │   │   │   ├── telemetry/
│   │   │   │   │   ├── telemetry.gateway.ts    ← WebSocket Gateway
│   │   │   │   │   └── csv-import.service.ts   ← ایمپورت دستی فاز ۱
│   │   │   │   ├── ai-gateway/                 ← Placeholder (بخش ۶)
│   │   │   │   │   ├── ai-gateway.port.ts
│   │   │   │   │   └── stub-ai-gateway.adapter.ts
│   │   │   │   └── auth/
│   │   │   ├── common/ (Guards, Interceptors, Filters)
│   │   │   └── main.ts
│   │   └── test/
│   └── frontend/                          ← React 19 + TS + Vite
│       └── src/
│           ├── modules/asset/, work-order/, dashboard/
│           └── lib/apiClient.ts, wsClient.ts
├── packages/
│   ├── contracts/                          ← DTO/Zod مشترک بک+فرانت
│   └── ui/                                 ← Tailwind v4 + shadcn/ui (RTL)
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml / .override.yml
└── docs/ (همین پوشه)
```

## ۲.۳ لایه‌بندی و مسئولیت‌ها
| لایه | مسئولیت | مثال |
|---|---|---|
| `*.controller.ts` | HTTP/REST endpoint، اعتبارسنجی DTO (class-validator/Zod) | `WorkOrderController` |
| `*.service.ts` | منطق دامنه، فراخوانی Repository | `WorkOrderService` |
| `*.machine.ts` | تعریف XState برای گردش‌کار | `workOrderMachine` |
| `*.gateway.ts` | WebSocket (Socket.io) برای استریم زنده | `TelemetryGateway` |
| `entities/` | مدل TypeORM/Prisma | `Equipment`, `Tag` |
| `ai-gateway/` | جدا از دامنه، پشت Interface (Dependency Inversion) | `StubAiGatewayAdapter` |

## ۲.۴ چندمستأجری
مشابه SafeOps: **Row-Level Security در PostgreSQL** روی `tenant_id` از فاز ۱ فعال (حتی برای یک مشتری Pilot) تا رشد آینده بدون Migration بزرگ ممکن باشد.

## ۲.۵ Audit Trail (الزام امنیتی مشترک با SafeOps)
همان الگوی Hash-chain (`sha256(prev_hash + ...)`) — پیاده‌سازی مشترک به‌صورت یک پکیج قابل‌استفادهٔ مجدد در `packages/audit` (هرچند در این پروژه، چون زبان TS است، این پکیج در NestJS و نه در Symfony نوشته می‌شود؛ منطق مشابه در SafeOps به‌صورت مستقل در PHP نوشته شده — تکرار عمدی چون دو زبان جدا هستند).

## ۲.۶ i18n و واحدهای صنعتی
- `nestjs-i18n` برای فارسی/انگلیسی.
- واحدهای اندازه‌گیری صنعتی (بار، دما، فشار) با یک کتابخانهٔ تبدیل واحد مرکزی (`packages/contracts/units.ts`) تا از ناهماهنگی SI/Imperial جلوگیری شود.
