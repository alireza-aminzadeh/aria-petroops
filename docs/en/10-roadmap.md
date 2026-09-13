# 10) Roadmap — Aria PetroOps

English technical manual. Persian original: [`../10-roadmap.md`](../10-roadmap.md).

## Phase 0 — done

Infra docs, Docker, deploy user, GitHub, DNS/TLS.

## Phase 1 — done

Turborepo, Prisma ISA-95 + hypertable, XState WO, CSV, JWT/CASL, SPA + ECharts, Jalali display switch, AI port, first deploy.

## Phase 2 — done in code

MQTT, optional OPC-UA, Isolation Forest, engineering RUL, anomaly WS, energy, ISA-18.2, SafeOps outbox, optional DB RLS, greedy maintenance scheduler.

## Phase 3 — open

| Item | Note |
|---|---|
| Blending / DoE / Bayesian | Mathematical production optimisation — **not** the greedy WO scheduler |
| Pipeline leak | Midstream module |
| Digital twin | Process unit model |
| Temporal | Multi-week TAR only |

## Phase 2 DoD (met)

MQTT → hypertable → WS; Isolation Forest opens events; RUL/explain return numbers; alarm + energy APIs return data; outbox rows exist when enabled.

## Honesty

`AI` in the UI is on-prem scoring. Hugging Face Spaces are not this runtime. `SAFEOPS_ENABLED` defaults false.
