# Report 02 — Feature matrix

**Language:** English first, then فارسی.  
**As of:** 13 September 2026

## English

| Capability | Status | Where | Notes |
|---|---|---|---|
| ISA-95 hierarchy | Built | Prisma + Assets page | |
| CSV historian-style import | Built | `csv-import.service` | Sample CSV download |
| MQTT ingest | Built | `MqttIngestService` | Flag `INDUSTRIAL_INGESTION_ENABLED` |
| OPC-UA read | Partial | Edge `node-opcua-client` | Optional URL; 20s timeout; fallback simulator |
| WebSocket live tags | Built | `TelemetryGateway` | Tenant rooms |
| Work order BPMS | Built | XState + persist | |
| CASL instance rules | Built | `CaslAbilityFactory` | Technician ≠ other tech’s WO |
| Hash-chain audit | Built | `AuditLog` | |
| Isolation Forest | Built | `ml/isolation-forest.ts` | |
| Engineering RUL | Built | `ml/rul.ts` ISO 10816 style | Not C-MAPSS LSTM |
| Local knowledge explain | Built | `knowledge/pack` | Keywords |
| HTTP LSTM-AE | Partial | `HttpAiGatewayAdapter` | Needs `AI_GATEWAY_URL` |
| Auto WO from anomaly | Partial | `POST /anomaly-events/{id}/work-order` | Suggested WO, not full CMMS |
| ISA-18.2 KPI | Built | `isa-18-2` + Alarms page | |
| Energy / flare / CO2e | Built | Energy module | Default factors |
| Heuristic scheduler | Built | `scheduler.ts` | Greedy, not CP-SAT |
| SafeOps outbox | Built | `IntegrationDelivery` | Off by default |
| Jalali/Gregorian display | Built | `lib/date.ts` | Not full i18n |
| English UI | Missing | FA strings | |
| Modbus / PI / PHD | Missing | | |
| Spare parts / MRO stock | Missing | | |
| Blending / DoE | Missing | Phase 3 | |
| Pipeline leak | Missing | HF only | |
| Digital twin | Missing | | |
| Temporal TAR | Missing | | |
| SSO / MFA | Missing | | |
| PWA | Missing | SafeOps has a shell; this SPA does not | |

---

## فارسی

تله‌متری MQTT، جنگل ایزوله، RUL فرمولی، آلارم ISA-18.2، انرژی، زمان‌بند حریصانه و outbox در کد هستند. LSTM-AE، Historian، blending، PWA و SSO نیستند. RUL این محصول مدل RotaGuard روی Hub نیست.
