# 5) API design — Aria PetroOps

English technical manual. Persian original: [`../05-api-design.md`](../05-api-design.md).

## 5.1 Principles

| Topic | Choice |
|---|---|
| HTTP | Nest + Fastify |
| OpenAPI | `https://petro.aria-ai.ir/api/docs` |
| Auth | Bearer JWT (Passport) |
| Login | `POST /api/auth/login` `{ username, password }` |
| Errors | `{ statusCode, message, error, timestamp }` |
| Validation | class-validator / Zod contracts |

No production passwords in this file.

## 5.2 REST (selected)

| Method | Path |
|---|---|
| POST | `/api/auth/login` |
| GET | `/api/auth/me`, `/api/auth/users` |
| GET/POST | `/api/sites`, `/units`, `/equipment`, `/tags` |
| POST | `/api/telemetry/csv-import` |
| GET | `/api/telemetry/readings?tagId=` |
| GET | `/api/telemetry/sample-csv` |
| CRUD | `/api/work-orders` + `POST /{id}/events` + `GET /{id}/audit` |
| POST | `/api/maintenance-plans/schedule` |
| GET | `/api/ai/status`, `/api/ai/rul` |
| POST | `/api/ai/anomaly-explain`, `/api/ai/knowledge-query` |
| GET | `/api/anomaly-events` + ack / work-order |
| GET | `/api/alarms`, `/api/alarms/kpis` |
| GET | `/api/energy/dashboard` |
| GET | `/health` (outside `/api` in production nginx) |

## 5.3 WebSocket and MQTT

WS path `/ws/tags` (see gateway). MQTT topic `petroops/v1/{tag}`. Edge publishes; Nest subscribes. OPC-UA is Edge-only read.

## 5.4 Throttling / versioning

`@nestjs/throttler` on login and `/api/ai/*`. No URI version yet; breaking change → `/api/v2`.
