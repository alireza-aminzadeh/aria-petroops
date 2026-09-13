# 4) Data model — Aria PetroOps

English technical manual. Persian original: [`../04-database-schema.md`](../04-database-schema.md).

## 4.1 Engine

PostgreSQL 16 + TimescaleDB. **`sensor_readings` is a hypertable** on `time` from Phase 1 (even when first filled by CSV).

## 4.2 ISA-95

```
Site 1—n Unit 1—n Equipment 1—n Tag 1—n SensorReading
Equipment 1—n WorkOrder
```

| Table | Keys |
|---|---|
| sites / units | `tenant_id`, names, process type |
| equipment | `tag_number` (e.g. P-101), class, criticality |
| tags | `tag_name`, UoM, `alarm_ll/lo/hi/hh` |
| sensor_readings | `time`, `tag_id`, `value`, `quality` (OPC quality codes for Phase 2) |

Hourly continuous aggregates may be defined in SQL (see Persian doc) for dashboard load.

## 4.3 Other models

Work orders, maintenance plans (`estimatedHours` for the scheduler), anomaly events, alarm events, energy meters/readings, integration outbox, AI query log, audit log, users (`username` unique).

Full columns: Prisma `apps/api/prisma/schema.prisma`.
