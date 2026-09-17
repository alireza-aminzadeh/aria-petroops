# Report 01 — Product status

**Language:** English first, then فارسی.  
**Product:** Aria PetroOps (`petro.aria-ai.ir`)  
**Kind:** Public demo — enter from [https://aria-ai.ir](https://aria-ai.ir)  
**As of:** 13 September 2026

## English

### Executive summary

PetroOps is past CSV-only BPMS. Phase 2 MQTT ingest, Isolation Forest, engineering RUL, ISA-18.2, energy dashboard, tenant Socket.IO rooms, optional DB RLS, and a SafeOps outbox are in the codebase and on the VPS. What is **not** done: blending, pipelines, digital twin, Temporal TAR, historian/Modbus, and Hub models on live tags.

Expected health: `GET https://petro.aria-ai.ir/health` → `status=ok`, `service=aria-petroops`, `db=up`, `mqtt=up` (mqtt may read `disabled` if ingest is off).

### Phase checklist

| Phase | Intent | Status |
|---|---|---|
| 0 — Infrastructure | Docs, Docker, deploy user, DNS `petro.aria-ai.ir`, TLS | Done |
| 1 — BPMS | ISA-95, work orders, CSV, JWT/CASL, SPA, AI port | Done |
| 2 — Live telemetry + on-prem AI | MQTT, optional OPC-UA, Isolation Forest, RUL, energy, ISA-18.2, SafeOps outbox, RLS opt-in | Done |
| 3 — Maturity | Blending, pipeline, twin, Temporal | Open (heuristic scheduler already shipped) |

### Definition of Done

| Criterion | Result |
|---|---|
| Work order `draft` → `closed` with audit | Yes |
| CSV import + WebSocket | Yes (plus MQTT in Phase 2) |
| Jest for machine, CASL, audit, scoring | Yes (17 spec files) |
| AI panels do not crash when HTTP unset | On-prem adapter returns real numbers for forest/RUL |
| CI to the Petro VPS | Yes |

### Inventory

| Kind | Count |
|---|---|
| SPA routes | Dashboard, assets, work orders, maintenance, alarms, energy, AI |
| Jest spec files under `apps/api` | 17 |
| Prisma models | Tenant, User, Site, Unit, Equipment, Tag, SensorReading, WorkOrder, MaintenancePlan, AnomalyEvent, AlarmEvent, EnergyMeter, EnergyReading, IntegrationDelivery, AiQueryLog, AuditLog |
| Compose services | nginx, app, postgres, redis, mqtt, edge |

---

## فارسی

این مخزن یک **دموی عمومی** است. برای مشاهده و کار کردن با دموها به [https://aria-ai.ir](https://aria-ai.ir) مراجعه کنید.

فاز ۲ تله‌متری و امتیازدهی on-prem روی Production است. blending، خط لوله، Digital Twin و Temporal باز هستند. زمان‌بند حریصانهٔ نت با solver تولید یکی نیست. سلامت: `/health` باید `aria-petroops` را ok برگرداند.
