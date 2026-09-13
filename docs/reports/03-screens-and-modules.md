# Report 03 — Screens and modules

**Language:** English first, then فارسی.  
**Source:** `apps/frontend/src/App.tsx`, `apps/api/src/modules/*`, Prisma schema

## English

### SPA

| Nav | Path | Nest module |
|---|---|---|
| Login | `/login` | `auth` |
| Dashboard | `/` | `telemetry` + health |
| Assets | `/assets` | `asset` |
| Work orders | `/work-orders`, `/:id` | `work-order` |
| Maintenance | `/maintenance` | `maintenance` |
| Alarms | `/alarms` | `alarm` |
| Energy | `/energy` | `energy` |
| AI | `/ai` | `ai-gateway`, `anomaly` |

UI is Persian RTL. A sidebar switch changes **numeral/calendar display** only.

### Prisma models

`Tenant`, `User`, `Site`, `Unit`, `Equipment`, `Tag`, `SensorReading` (hypertable), `WorkOrder`, `MaintenancePlan`, `AnomalyEvent`, `AlarmEvent`, `EnergyMeter`, `EnergyReading`, `IntegrationDelivery`, `AiQueryLog`, `AuditLog`.

### Edge

`infra/edge-agent` publishes to `petroops/v1/{tag}`. If `OPCUA_ENDPOINT_URL` is empty or the server is down, it falls back to a simulator so local/demo MQTT still moves.

---

## فارسی

هفت صفحهٔ اصلی بعد از ورود. مدل داده ISA-95 به‌اضافهٔ آنومالی، آلارم، انرژی و outbox. Edge فقط publish می‌کند.
