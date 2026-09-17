# 1) Product overview — Aria PetroOps (PetroPayesh)

English technical manual. Persian original: [`../01-overview.md`](../01-overview.md).

## 1.1 Purpose

Integrated **asset, process, and energy intelligence** for oil, gas, and petrochemical units.

Data collection, process analysis, and implementation of this project were carried out in **2024, 2025, and 2026**.

| | |
|---|---|
| Public site | https://petro.aria-ai.ir |
| GitHub | https://github.com/alireza-aminzadeh/aria-petroops |
| Sister | [Aria SafeOps](https://github.com/alireza-aminzadeh/aria-safeops) |
| Project period | 2024, 2025, and 2026 — data collection, process analysis, and implementation |

## 1.2 Why NestJS (not Symfony)

- Real-time tag streams (Nest WebSocket gateway).
- OPC-UA / MQTT live in Node (and Python), not in mature PHP libraries.
- Shared TypeScript with the React SPA via `packages/contracts`.

## 1.3 Users

| Role | Need |
|---|---|
| Reliability engineer | Health, RUL, rotating-equipment anomaly |
| Process engineer | Multivariate-ish anomaly view, alarm KPI |
| Maintenance planner | PM/CBM, TAR heuristic, work orders |
| Energy manager | Balance, flare, carbon estimate |

Seed roles in code: `ADMIN`, `PLANNER`, `TECHNICIAN`, plus reliability/energy names in docs where seeded.

## 1.4 Modules vs plan

| # | Module | Original phase | Now |
|---|---|---|---|
| 1 | Industrial data hub | 1 CSV-only | CSV + MQTT + optional OPC-UA read |
| 2 | Asset health / PdM | 2 | Forest + engineering RUL |
| 3 | Process anomaly / alarm | 2 | ISA-18.2 + explain pack |
| 4 | Energy / emissions | 2 | Dashboard with default factors |
| 5 | Maintenance / TAR / MRO | 1 BPMS | WO + greedy scheduler; no spares |
| 6 | Production / blending | 3 | Open |
| 7 | Pipelines | 3 optional | Open |
| 8 | OT security | optional | Open |

## 1.5 Phase 2 scope (current)

In: MQTT Timescale + WS, Isolation Forest, ISO 10816-style RUL, energy/flare, ISA-18.2, SafeOps outbox, optional RLS.

Out: heavy RAG, digital twin, writes to DCS/PLC (forbidden).

## 1.6 Login

Bootstrap username `alireza` (same as SafeOps). Local password `alireza`. Production: `SEED_ALIREZA_PASSWORD` on the server only.
