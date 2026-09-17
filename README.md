# Aria PetroOps (PetroPayesh)

Asset, process, and energy intelligence for oil, gas, and petrochemical operations — predictive maintenance, process anomaly, energy, and maintenance/TAR.

**Project period:** Data collection, process analysis, and implementation of this project were carried out in **2024, 2025, and 2026**.

**Language:** [English](#english) · [فارسی](#persian)

**Live:** [https://petro.aria-ai.ir](https://petro.aria-ai.ir) · **API docs:** [https://petro.aria-ai.ir/api/docs](https://petro.aria-ai.ir/api/docs) · **Health:** [https://petro.aria-ai.ir/health](https://petro.aria-ai.ir/health)

[![CI/CD](https://github.com/alireza-aminzadeh/aria-petroops/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/alireza-aminzadeh/aria-petroops/actions/workflows/ci-cd.yml)
[![Production](https://img.shields.io/badge/production-petro.aria--ai.ir-1f6feb)](https://petro.aria-ai.ir)

Sister product: [Aria SafeOps](https://github.com/alireza-aminzadeh/aria-safeops) (`hse.aria-ai.ir`) — electronic PTW / PSM. PetroOps can push open anomalies so SafeOps holds permits on the same `equipment_tag`.

---

<a id="english"></a>

# Aria PetroOps — English

Aria PetroOps is the APM / process / energy product of [Aria AI](https://aria-ai.ir). It is a **Turborepo + pnpm** modular monolith: NestJS 11 (Fastify) + Prisma + XState for work orders; a React 19 SPA with ECharts for live tags. An **outbound-only** Edge Agent publishes MQTT (optional read-only OPC-UA). This API **never writes to DCS/PLC**.

Data collection, analysis of plant processes, and delivery of this system took place across **2024, 2025, and 2026**.

Persian engineering notes: [`docs/`](docs/). English manuals: [`docs/en/`](docs/en/). Status, KPI, gap, and Hugging Face reports: [`docs/reports/`](docs/reports/).

## 1. Snapshot (13 September 2026)

| Item | Value |
|---|---|
| Product name | Aria PetroOps («پتروپایش») |
| Project period | 2024, 2025, and 2026 (data collection, process analysis, implementation) |
| Public URL | https://petro.aria-ai.ir |
| GitHub | https://github.com/alireza-aminzadeh/aria-petroops |
| Current delivery | Phase 1 BPMS + Phase 2 live telemetry and on-prem scoring |
| Backend | Node 22 · NestJS 11 · Fastify 5 · Prisma 6 · XState v5 · CASL |
| Frontend | React 19 · TypeScript · Vite · Tailwind v4 (RTL) · ECharts |
| Data | PostgreSQL 16 + TimescaleDB hypertable `sensor_readings` · Redis 7.4 |
| Ingest | MQTT (Mosquitto 2) + optional OPC-UA read in Edge · CSV import |
| AI | Isolation Forest + ISO 10816 engineering RUL + local knowledge; HTTP LSTM-AE if `AI_GATEWAY_URL` is set |
| Energy / alarm | 24h energy balance, flare ratio, default GHG factors; ISA-18.2 flood/chatter/standing |
| Tenancy | Application `tenantId` filter + optional Postgres RLS (`APP_DB_PASSWORD`) |
| CI/CD | GitHub Actions → GHCR (`ghcr.io/alireza-aminzadeh/aria-petroops-app`) → SSH `/opt/aria-petroops` |
| License | Proprietary |

## 2. What the product does

| Module | What operators get today | Honesty note |
|---|---|---|
| **ISA-95 data hub** | Site → unit → equipment → tag; CSV + MQTT into Timescale | No Modbus, no PI/PHD historian connector |
| **Work orders (BPMS)** | XState: draft → assigned → in progress → pending approval → approved → closed | Not SAP PM / GITA CMMS |
| **Maintenance / TAR heuristic** | Greedy list-scheduling of approved jobs onto technicians | Not OR-Tools/CP-SAT; not Temporal for multi-week TAR |
| **Asset health** | Isolation Forest events, health score, engineering RUL | Not C-MAPSS LSTM from RotaGuard on live tags |
| **Process anomaly explain** | Local knowledge text on an event; HTTP LSTM-AE optional | TEP/RefineryGuard mapping not automatic |
| **ISA-18.2 alarms** | Average/peak per 10 min, flood flag, standing, chattering tags | KPI report, not a full alarm-management system |
| **Energy and carbon** | Meters, CO2e, flare/fuel ratio, default factors | Default factors until site calibration; not steam/fuel optimiser |
| **SafeOps outbox** | `POST …/anomalies` when enabled | Default `SAFEOPS_ENABLED=false` |
| **Production optimisation / blending** | — | Phase 3 |
| **Pipeline leak** | — | PipelineWatch is HF-only |
| **OT security (ICS)** | — | Not built |
| **Digital twin** | — | Phase 3 |

## 3. In-app reports and KPIs

| Screen | Route | Report | API |
|---|---|---|---|
| Live dashboard | `/` | Tag time series (history + WebSocket), MQTT health, CSV import | `/tags`, `/telemetry/readings`, `/health`, `/ws` |
| Assets | `/assets` | ISA-95 tree | `/sites`, `/units`, `/equipment`, `/tags` |
| Work orders | `/work-orders` | Status, assignee, hash-chain audit | `/work-orders`, `/events`, `/audit` |
| Maintenance | `/maintenance` | PM/CBM plans + “auto schedule” | `/maintenance-plans`, `POST …/schedule` |
| Alarms | `/alarms` | ISA-18.2 KPI cards + alarm table | `/alarms`, `/alarms/kpis?hours=8` |
| Energy | `/energy` | 24h CO2e, flare ratio, fuel gas, meter table | `/energy/dashboard?hours=24` |
| AI / health | `/ai` | Anomaly list, explain, RUL, knowledge query | `/ai/*`, `/anomaly-events` |

ISA-18.2 framing in the UI: sustainable target **about one alarm per ten minutes**. Flood is a boolean from that window. Details: [`docs/reports/04-in-app-kpis-and-reports.md`](docs/reports/04-in-app-kpis-and-reports.md).

## 4. Architecture

```
React SPA  --HTTPS + Socket.IO-->  Nginx
                                      |
                                   NestJS 11 Fastify
                                     asset · work-order · telemetry
                                     alarm · energy · anomaly · ai-gateway · integration
                                      |
                    Timescale hypertable          Redis
                                      ^
                          Mosquitto <— Edge Agent (MQTT publish only)
                                       optional OPC-UA read
```

**Hard rule:** Edge is outbound. Nest subscribes. No control commands to the plant.

| Layer | Responsibility |
|---|---|
| Controllers | REST + DTO validation |
| Services | Domain + Prisma |
| `work-order.machine.ts` | XState persist |
| `TelemetryGateway` | JWT handshake; emit to `tenant:{id}` rooms only |
| `AiGatewayPort` | Isolation Forest / RUL / knowledge / HTTP |

## 5. Work-order state machine

`draft → assigned → inProgress → pendingApproval → approved → closed` (cancel from draft/assigned; reject returns to inProgress).

CASL is **instance-aware**: a technician may START/SUBMIT only the work order assigned to them. Planners/admins approve/reject/close in-tenant.

## 6. Tech stack

| Concern | Choice |
|---|---|
| API | NestJS 11 + Fastify (small VPS) |
| ORM | Prisma 6 |
| Workflow | XState v5 |
| AuthZ | JWT + CASL |
| Contracts | `packages/contracts` (Zod DTOs shared with frontend) |
| MQTT | `mqtt.js` + Mosquitto 2.0 |
| OPC-UA | `node-opcua-client` in Edge (optional endpoint) |
| Charts | ECharts |
| Calendar | `date-fns-jalali` + sidebar switch **display** Jalali/Gregorian (UI strings stay Persian) |

## 7. Hugging Face alignment (demos, not this runtime)

| Hub project | Intended PetroOps method | Reality |
|---|---|---|
| [RotaGuard](https://huggingface.co/spaces/alirezaaminzadeh/rotaguard-predictive-maintenance) | `estimateRemainingUsefulLife` | Space is C-MAPSS/CWRU samples, not live ISA-95 vibration tags |
| [RefineryGuard](https://huggingface.co/spaces/alirezaaminzadeh/refineryguard-process-anomaly) | `explainAnomaly` | 52 TEP features; needs a mapper before plant tags |
| [PipelineWatch](https://huggingface.co/spaces/alirezaaminzadeh/pipelinewatch-leak-detection) | — | No midstream module in this SPA |

Do not point `AI_GATEWAY_URL` at a Gradio Space. See [`docs/reports/06-huggingface-alignment.md`](docs/reports/06-huggingface-alignment.md).

## 8. Local development

Postgres/Redis/MQTT in Docker; Nest + Vite on the Windows host (Docker DNS to npm/Alpine is unreliable here). API port **3002**. UI **5173**.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis mqtt
docker compose up -d edge   # optional simulator
pnpm --filter @aria/contracts build
pnpm --filter @aria/api exec prisma migrate deploy
pnpm --filter @aria/api exec prisma db seed
# INDUSTRIAL_INGESTION_ENABLED=true
# MQTT_BROKER_URL=mqtt://127.0.0.1:1883
pnpm --filter @aria/api start:dev
pnpm --filter @aria/frontend dev
```

| Surface | URL |
|---|---|
| UI | http://localhost:5173 |
| API | http://127.0.0.1:3002 |
| OpenAPI | http://127.0.0.1:3002/api/docs |
| Health | http://127.0.0.1:3002/health |

Debug binds (override only): Postgres `127.0.0.1:15432`, Redis `127.0.0.1:16379`.

```powershell
pnpm --filter @aria/api test
```

## 9. Seed users (local / demo only)

Production bootstrap password is **not** in git (`SEED_ALIREZA_PASSWORD`).

| Username / email | Local password | Role |
|---|---|---|
| `alireza` | `alireza` | Shared bootstrap name with SafeOps |
| `admin` / `admin@petro.aria-ai.ir` | `ChangeMe!Admin1` | ADMIN |
| `planner` / `planner@petro.aria-ai.ir` | `ChangeMe!Planner1` | PLANNER |
| `tech` / `tech@petro.aria-ai.ir` | `ChangeMe!Tech1` | TECHNICIAN |

## 10. Documentation map

| Path | Language | Contents |
|---|---|---|
| [`README.md`](README.md) | EN then FA | This file |
| [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) | EN then FA | Full index |
| [`docs/01-overview.md`](docs/01-overview.md) … [`10-roadmap.md`](docs/10-roadmap.md) | FA | Original manuals |
| [`docs/en/`](docs/en/) | EN | English manuals |
| [`docs/reports/`](docs/reports/) | EN then FA | Status, features, KPIs, gaps, HF, CI, SafeOps link |

## 11. CI/CD

`main`: pnpm install, Prisma generate, contracts build, lint, `prisma migrate deploy`, provision restricted DB role (RLS regression), Jest, GHCR push, SSH deploy (`compose pull --ignore-buildable && up -d --build`). Edge image is built on the server (`aria-petroops-edge:local`) so the 2 vCPU box does not compile the app image.

Secrets: `PETROOPS_SSH_HOST`, `PETROOPS_SSH_USER`, `PETROOPS_SSH_KEY`.

## 12. Phase 3 still open

Blending/DoE, pipeline leak module, digital twin, Temporal for long TAR. Heuristic maintenance scheduling is **already** in Phase 2 and must not be confused with a mathematical production solver.

---

<a id="persian"></a>

# آریا پترواپس («پتروپایش») — فارسی

سامانهٔ **هوشمندی دارایی، فرآیند و انرژی** برای نفت، گاز و پتروشیمی. محصول APM مجموعهٔ [آریا اِی‌آی](https://aria-ai.ir).

**دورهٔ پروژه:** گردآوری اطلاعات، تحلیل و آنالیز فرآیندها، و اجرای این سامانه در سال‌های **۲۰۲۴، ۲۰۲۵ و ۲۰۲۶** انجام شده است.

**زنده:** [https://petro.aria-ai.ir](https://petro.aria-ai.ir) · **API:** [https://petro.aria-ai.ir/api/docs](https://petro.aria-ai.ir/api/docs)

سامانهٔ خواهر: [Aria SafeOps](https://github.com/alireza-aminzadeh/aria-safeops). Edge فقط outbound است؛ این API هرگز به DCS/PLC فرمان نمی‌دهد.

## ۱. وضعیت یک‌نگاه (۲۲ شهریور ۱۴۰۵)

| مورد | مقدار |
|---|---|
| دورهٔ پروژه | سال‌های ۲۰۲۴، ۲۰۲۵ و ۲۰۲۶ (گردآوری اطلاعات، تحلیل فرآیندها، اجرا) |
| تحویل فعلی | فاز ۱ BPMS + فاز ۲ تله‌متری زنده و امتیازدهی on-prem |
| بک‌اند | NestJS 11 · Fastify · Prisma · XState · CASL |
| تله‌متری | MQTT + OPC-UA فقط‌خواندنی اختیاری در Edge · CSV |
| AI | Isolation Forest + RUL مهندسی ISO 10816؛ LSTM-AE فقط با `AI_GATEWAY_URL` |
| انرژی / آلارم | تراز ۲۴ساعته، فلر، ضریب پیش‌فرض GHG؛ KPI ISA-18.2 |
| چندمستأجری | فیلتر کد + RLS اختیاری |

## ۲. ماژول‌ها

Data Hub ISA-95، Work Order با CASL نمونه‌محور، زمان‌بند حریصانهٔ نت (نه OR-Tools)، Isolation Forest، KPI آلارم، داشبورد انرژی، outbox به SafeOps. **نیست:** blending، نشت خط لوله، Digital Twin، کانکتور Historian/Modbus، مدل C-MAPSS روی تگ زنده.

## ۳. گزارش‌های داخل سامانه

داشبورد سری‌زمانی تگ، آلارم ISA-18.2 (میانگین/اوج ۱۰ دقیقه، flood، chatter، ایستاده)، انرژی (CO2e، نسبت فلر، کنتورها)، RUL و توضیح آنومالی در صفحهٔ AI. هدف پایدار آلارم: حدود یک آلارم در ده دقیقه.

## ۴. اجرای محلی

```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis mqtt
pnpm --filter @aria/contracts build
pnpm --filter @aria/api exec prisma migrate deploy
pnpm --filter @aria/api exec prisma db seed
pnpm --filter @aria/api start:dev
pnpm --filter @aria/frontend dev
```

UI: http://localhost:5173 — API: http://127.0.0.1:3002

رمز Production در git نیست (`SEED_ALIREZA_PASSWORD`).

## ۵. نقشهٔ مستندات

اسناد فارسی `docs/01` تا `10`؛ انگلیسی `docs/en/`؛ گزارش‌های جدولی `docs/reports/`. نسخهٔ انگلیسی همین README از [ابتدای فایل](#english) شروع می‌شود.
