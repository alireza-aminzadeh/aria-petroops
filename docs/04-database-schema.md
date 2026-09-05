# ۴) مدل داده — Aria PetroOps

## ۴.۱ موتور دیتابیس
PostgreSQL 16 + پسوند TimescaleDB (`timescale/timescaledb:2.17.2-pg16`). برخلاف SafeOps، اینجا **hypertable از فاز ۱ معنادار است** چون هدف نهایی ذخیرهٔ سری‌زمانی تگ‌های صنعتی است (حتی اگر در فاز ۱ فقط از طریق CSV دستی پر شود، نه اتصال زندهٔ OPC-UA).

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## ۴.۲ مدل دارایی ISA-95 (سلسله‌مراتب)

```mermaid
erDiagram
    SITES ||--o{ UNITS : contains
    UNITS ||--o{ EQUIPMENT : contains
    EQUIPMENT ||--o{ TAGS : has
    TAGS ||--o{ SENSOR_READINGS : produces
    EQUIPMENT ||--o{ WORK_ORDERS : targets
    WORK_ORDERS ||--o{ MAINTENANCE_PLANS : scheduled_by
```

### `sites` / `units` / `equipment` / `tags`
| جدول | ستون‌های کلیدی |
|---|---|
| `sites` | `id`, `tenant_id`, `name`, `location` |
| `units` | `id`, `site_id` FK، `name`, `process_type` (مثلاً «واحد تقطیر») |
| `equipment` | `id`, `unit_id` FK، `tag_number` (شناسهٔ یکتای صنعتی، مثل `P-101`)، `equipment_class` (پمپ/کمپرسور/توربین)، `criticality` |
| `tags` | `id`, `equipment_id` FK، `tag_name`، `unit_of_measure`، `data_type`، حدود آلارم `alarm_ll/lo/hi/hh` |

### `sensor_readings` (Hypertable TimescaleDB)
| ستون | نوع | توضیح |
|---|---|---|
| `time` | timestamptz | ستون Partition اصلی Hypertable |
| `tag_id` | uuid FK → tags | |
| `value` | double precision | |
| `quality` | smallint | کد کیفیت OPC-UA (Good/Bad/Uncertain) — برای فاز ۲ |

```sql
SELECT create_hypertable('sensor_readings', 'time');

-- Continuous Aggregate برای میانگین ساعتی (کاهش بار کوئری داشبورد)
CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT tag_id, time_bucket('1 hour', time) AS bucket, avg(value) AS avg_value
FROM sensor_readings
GROUP BY tag_id, bucket;
```

> در فاز ۲ داده از MQTT/Edge و CSV هر دو وارد hypertable می‌شود.

### `users`
| ستون | نوع | توضیح |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK → tenants | |
| username | text unique | شناسهٔ ورود (در لوکال و Production: `alireza`) |
| email | text unique | |
| password_hash | text | bcrypt |
| roles | jsonb | مثلاً `["ADMIN"]` |
| full_name | text | |

### `work_orders`
| ستون | نوع | توضیح |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| equipment_id | uuid FK → equipment | |
| status | varchar | Marking سازگار با `work_order` XState machine |
| priority | varchar | Low/Medium/High/Critical |
| description | text | |
| assigned_to | uuid FK → users nullable | |
| machine_snapshot | jsonb | آخرین snapshot XState (برای rehydrate) |
| created_at, updated_at | timestamptz | |

### `maintenance_plans`
| ستون | نوع | توضیح |
|---|---|---|
| id | uuid PK | |
| equipment_id | uuid FK | |
| plan_type | varchar | `PM` (زمان‌بندی‌شده) / `CBM` (بر اساس وضعیت) |
| frequency_days | integer nullable | |
| status | varchar | `draft` / `submitted` / `approved` / `rejected` |
| next_due_at | date | |

### `anomaly_events`
| ستون | نوع | توضیح |
|---|---|---|
| id | uuid PK | |
| tag_id | uuid FK nullable | تگ با بیشترین سهم |
| equipment_id | uuid FK nullable | |
| detected_at | timestamptz | |
| score | double precision nullable | امتیاز Isolation Forest (۰–۱) |
| status | varchar | `open` / `acknowledged` / `closed` |
| method | varchar | پیش‌فرض `isolation_forest` |
| summary | text | |
| contributors | jsonb | تگ‌های مؤثر (z-score) |

### `alarm_events` / `energy_meters` / `energy_readings` / `integration_deliveries`
آلارم حد تگ (ISA-18.2)، کنتور انرژی/کربن (hypertable)، و outbox اتصال به SafeOps. جزئیات در migration `20260905200000_phase2_telemetry_ai`.

### `ai_query_log`
لاگ پرسش از موتور on-prem یا Gateway مرکزی.

### `audit_log` (Hash-chain)
همان ساختار مفهومی SafeOps (`sha256(prev_hash + ...)`) — پیاده‌سازی جدا در TypeORM/Prisma.

## ۴.۳ ORM
**Prisma** (schema.prisma به‌عنوان source of truth، migration خودکار با `prisma migrate`). دلیل انتخاب Prisma به‌جای TypeORM: type-safety بهتر برای Query در مونوریپوی TypeScript و سازگاری راحت‌تر با DTO مشترک در `packages/contracts`.

## ۴.۴ Retention Policy برای دادهٔ سری‌زمانی (فاز ۲، وقتی حجم واقعی بالا رفت)
```sql
SELECT add_retention_policy('sensor_readings', INTERVAL '2 years');
```
(در فاز ۲ با MQTT زنده این Policy روی hypertable اعمال می‌شود.)
