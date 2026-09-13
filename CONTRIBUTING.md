# Contributing — Aria PetroOps

**Language:** [English](#english) · [فارسی](#persian)

<a id="english"></a>

## English

Private proprietary repository. Internal changes must keep the OT one-way rule and the compose security comments.

### Layout

| Path | Role |
|---|---|
| `apps/api` | NestJS 11 |
| `apps/frontend` | React 19 SPA |
| `packages/contracts` | Shared Zod/DTO |
| `infra/edge-agent` | MQTT publisher + optional OPC-UA read |
| `docs/` | FA manuals; `docs/en/`; `docs/reports/` |

### Rules of thumb

1. Never add a write path from Nest to OPC-UA/Modbus/DCS.
2. Broadcast telemetry only with `server.to('tenant:' + tenantId)`.
3. CASL checks must use the **record**, not only the subject type.
4. Do not call public Hugging Face Spaces from the production request path.
5. Update documentation **English first**, then Persian.
6. Keep shell scripts LF.

### Checks

```powershell
pnpm --filter @aria/api lint
pnpm --filter @aria/api test
pnpm --filter @aria/frontend lint
```

---

<a id="persian"></a>

## فارسی

مسیر نوشتن به OT اضافه نکنید. Broadcast فقط روی room تننت. CASL باید نمونهٔ Work Order را ببیند. Space عمومی HF را در Production صدا نزنید. مستندات را اول انگلیسی بعد فارسی به‌روز کنید.
