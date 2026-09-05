# Aria PetroOps («پتروپایش») — petro.aria-ai.ir

هوشمندی دارایی، فرآیند و انرژی برای صنعت نفت، گاز و پتروشیمی — نگهداری پیش‌بینانه، آنومالی فرآیندی، انرژی، نت/TAR.

> سند مرجع: [`../docs/oil-gas-petrochemical-strategy.md`](../docs/oil-gas-petrochemical-strategy.md)

## وضعیت فعلی

فاز ۱ هستهٔ BPMS روی Production فعال است: [https://petro.aria-ai.ir](https://petro.aria-ai.ir)

| مورد | وضعیت |
|---|---|
| بک‌اند | NestJS 11 + Fastify + Prisma + XState + CASL |
| فرانت‌اند | React 19 + Vite + Tailwind v4 (RTL) |
| RAG/LLM | Stub — endpointها `503` می‌دهند |
| OPC-UA/MQTT | پیاده‌سازی نشده (فاز ۲) |
| استقرار Production | فعال روی `91.107.149.251` با CI/CD و HTTPS |

## اجرای محلی

روی این ماشین Windows، رجیستری npm و Alpine از داخل Docker در دسترس نیست؛ Postgres/Redis در Docker می‌مانند و Nest + Vite روی میزبان اجرا می‌شوند. پورت ۸۰ را Apache محلی اشغال کرده است.

```powershell
Copy-Item .env.example .env   # اگر .env ندارید
docker compose up -d postgres redis
pnpm --filter @aria/contracts build
pnpm --filter @aria/api exec prisma migrate deploy
pnpm --filter @aria/api exec prisma db seed
pnpm --filter @aria/api start:dev
# ترمینال دیگر:
pnpm --filter @aria/frontend dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- API: [http://127.0.0.1:3002](http://127.0.0.1:3002) — docs: `/api/docs` ، health: `/health`

API روی پورت `3002` است تا با سایر سرویس‌های محلی تداخل نداشته باشد.

## ورود

هر دو سامانه (PetroOps و SafeOps) یک کاربر راه‌انداز مشترک با **نام کاربری `alireza`** دارند.

| محیط | نام کاربری | رمز عبور |
|---|---|---|
| لوکال (`prisma db seed` یا استارت Nest روی میزبان) | `alireza` | `alireza` |
| Production (`ARIA_RUNTIME=production`) | `alireza` | `Aria7x!Alireza#Ops2026` |

رمز Production در هر دو سامانه یکسان است. برای بازنویسی، متغیر `SEED_ALIREZA_PASSWORD` را در `.env` سرور ست کنید.

کاربران نمونهٔ دیگر (همچنان معتبر):

| نام کاربری / ایمیل | رمز | نقش |
|---|---|---|
| `admin` / `admin@petro.aria-ai.ir` | `ChangeMe!Admin1` | ADMIN |
| `planner` / `planner@petro.aria-ai.ir` | `ChangeMe!Planner1` | PLANNER |
| `tech` / `tech@petro.aria-ai.ir` | `ChangeMe!Tech1` | TECHNICIAN |

Postgres debug: 127.0.0.1:15432
Redis debug: 127.0.0.1:16379

تست:

```powershell
pnpm --filter @aria/api test
```
