# 2) Architecture — Aria PetroOps

English technical manual. Persian original: [`../02-architecture.md`](../02-architecture.md).

## 2.1 Pattern

Modular monolith on NestJS. Turborepo + pnpm shares types between API and frontend.

```
React SPA --HTTPS + WSS--> Nginx
                            NestJS 11 Fastify
                              Asset · WorkOrder · Telemetry · Alarm · Energy · Anomaly · AI · Integration
                            PostgreSQL 16 + Timescale     Redis 7
Mosquitto + Edge (outbound)     optional AI_GATEWAY_URL (LSTM-AE)
```

## 2.2 Tree (as built)

```
aria-petroops/
├── apps/api/src/modules/{asset,work-order,telemetry,alarm,energy,anomaly,ai-gateway,integration,auth,maintenance}/
├── apps/frontend/
├── packages/contracts/
├── infra/edge-agent/
├── docker-compose.yml
└── docs/
```

`packages/ui` was a target; the SPA currently owns Tailwind styles. `nestjs-i18n` was sketched; the UI is still Persian with a calendar switch.

## 2.3 Layers

Controllers → services → Prisma / XState machine → gateways. AI behind `AiGatewayPort` (DIP).

## 2.4 Tenancy

Always filter `tenantId` in application code. Optional second layer: Postgres RLS via `app.tenant_id` set on each Prisma query and a non-`BYPASSRLS` role (`APP_DB_PASSWORD`). Socket.IO rooms `tenant:{id}`.

## 2.5 Audit

Same hash-chain idea as SafeOps, implemented in TypeScript (`AuditLog`). Deliberate duplication across languages.

## 2.6 Units

Industrial units belong in `packages/contracts` so SI/imperial labels do not drift. Dashboard still displays the tag’s `unitOfMeasure` as stored.
