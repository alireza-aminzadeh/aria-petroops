# Report 04 — In-app KPIs and reports

**Language:** English first, then فارسی.  
**Source:** `AlarmsPage.tsx`, `EnergyPage.tsx`, `DashboardPage.tsx`, `isa-18-2`, energy service

These are **screens in the SPA**, not scheduled PDF packs.

## English

### 4.1 Live tag dashboard (`/`)

| Element | Meaning |
|---|---|
| Tag picker | ISA-95 tags for the tenant |
| ECharts line | `sensor_readings` history; live points via Socket.IO |
| MQTT chip | `/health` → `mqtt` up/disabled/unknown |
| CSV import | ADMIN / PLANNER / RELIABILITY_ENGINEER |

### 4.2 ISA-18.2 alarm analysis (`/alarms`)

Window in UI: **8 hours**. Target copy: about **one alarm per ten minutes**.

| KPI | Field | Reading |
|---|---|---|
| Average per 10 minutes | `averagePer10Min` | Rate |
| Peak 10-minute | `peakPer10Min` | Burst |
| Flood | `flood` | Boolean over threshold |
| Standing | `standingCount` | Still open |
| Chattering | `chatteringTagIds` | Tags flipping |

Alarm table columns: tag, type, priority, state, message, start time.

This is a **KPI report** on limit crossings derived from tags. It is not a replacement for an alarm-management philosophy project (shelving, rationalisation workshop, etc.).

### 4.3 Energy and emissions (`/energy`)

Default window: **24 hours** (`/energy/dashboard?hours=24`).

| Card | Meaning |
|---|---|
| Estimated CO2e | kg, using **default** factors until calibrated |
| Flare-to-gas ratio | `flareRatio` |
| Fuel gas (mean) | `byKind.fuel_gas` |
| Meter table | Latest value + 24h CO2e per meter |

Disclaimer text from the API is shown under the title — factors are not site-lab certified.

### 4.4 Asset health (`/ai`)

| Widget | Source |
|---|---|
| Anomaly events | Isolation Forest `open` / ack / close |
| Explain | Local pack or HTTP |
| RUL | Engineering estimate from vibration-like tags when present |
| Knowledge query | Local pack |

### 4.5 Work-order audit

`GET /api/work-orders/{id}/audit` — hash-chain of transitions for that order.

### 4.6 Not an in-app report yet

Board GHG inventory, TAR Gantt, spare-part stockout, PipelineWatch leak tickets, English dashboards.

---

## فارسی

داشبورد تگ زنده، KPI آلارم هشت‌ساعته (هدف حدود یک آلارم در ده دقیقه)، تراز انرژی ۲۴ساعته با ضریب پیش‌فرض، و RUL/آنومالی در صفحهٔ AI. موجودی قطعات، گانت TAR و گزارش سازمانی GHG هنوز صفحه ندارند.
