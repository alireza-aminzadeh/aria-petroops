# Report 05 — Gap analysis

**Language:** English first, then فارسی.

## English

### Summary

Telemetry and a **formula-grade** health layer exist. The strategy’s competitive APM story (LSTM-AE on a real unit, RotaGuard RUL, CMMS connector, air-gap) does not. Isolation Forest + ISO 10816 is enough for a pilot demo; it is not enough to displace SAP PM or a PI System analytics overlay.

### Gaps

| Theme | Today | Gap | Sales priority |
|---|---|---|---|
| ML on a real unit | Isolation Forest | RefineryGuard LSTM-AE with tag mapping | **P1** for APM |
| RUL | ISO 10816 formula | C-MAPSS-class model on site vibration | **P1** |
| Data hub | MQTT + CSV + optional OPC | Modbus, PI/PHD | **P1** for a refinery |
| CMMS | Internal WO only | GITA / SAP PM connector | **P1** |
| Auto WO | Suggested from anomaly | Closed-loop with spares | P2 |
| Energy | Default factors | Calibrated GHG + steam/fuel opt | P2 |
| Scheduler | Greedy | OR-Tools/CP-SAT | P3 |
| Blending | — | Phase 3 | P3 |
| Pipeline | — | Module + PipelineWatch on-prem | P3 |
| SafeOps | Outbox off by default | Enable + MOC/asset ids | P2 |
| Identity | Local JWT | Keycloak | P2 |
| Observe / air-gap | GHCR pull | Offline bundle + Grafana | P2 |

### Do not claim

- Live plant historian is connected (unless a specific Edge is configured at a site).
- RUL is the published RotaGuard RMSE 15.23 model.
- Energy CO2e is a verified inventory.

---

## فارسی

تله‌متری و لایهٔ سلامت فرمولی هست؛ APM رقابتی (LSTM-AE واحد واقعی، RUL شبکه، کانکتور CMMS) نیست. جنگل ایزوله برای دموی پایلوت کافی است نه برای جایگزینی SAP PM.
