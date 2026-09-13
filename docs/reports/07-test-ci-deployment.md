# Report 07 — Tests, CI, and deployment

**Language:** English first, then فارسی.  
**Workflow:** `.github/workflows/ci-cd.yml`

## English

### Jest inventory (17 files)

| Spec | Protects |
|---|---|
| `work-order.machine.spec.ts` | XState |
| `work-order.service.spec.ts` | Transitions + CASL |
| `casl-ability.factory.spec.ts` | Instance rules |
| `audit.service.spec.ts` | Hash-chain |
| `csv-parser.spec.ts` | CSV ingest |
| `mqtt-payload.spec.ts` | MQTT payload |
| `isolation-forest.spec.ts` | Scoring |
| `score-equipment.spec.ts` | Health |
| `rul.spec.ts` | ISO 10816-style RUL |
| `pack.spec.ts` | Knowledge pack |
| `isa-18-2.spec.ts` | Alarm KPIs |
| `energy-factors.spec.ts` | GHG factors |
| `safeops-integration.service.spec.ts` | Outbox |
| `scheduler.spec.ts` | Heuristic scheduler |
| `maintenance.service.spec.ts` | Plans + schedule API |
| `tenant-context.service.spec.ts` | Tenant ALS |
| `tenant-context.interceptor.spec.ts` | Prisma `app.tenant_id` |

CI also: `prisma migrate deploy` and `provision-app-role.js` (restricted role without `BYPASSRLS`).

### Pipeline

```
test (Node 22, pnpm, Prisma, lint, Jest)
  → build-and-push GHCR aria-petroops-app
    → SSH deploy: git reset, IMAGE_TAG, compose pull --ignore-buildable, up -d --build
```

App image is **not** built on the 2 vCPU VPS (OOM). Edge is `aria-petroops-edge:local` on the server.

Secrets: `PETROOPS_SSH_HOST`, `PETROOPS_SSH_USER`, `PETROOPS_SSH_KEY`.

### Production services

nginx, app (GHCR), postgres, redis, mqtt, edge. Only 80/443 on the host.

---

## فارسی

هفده spec، مهاجرت Prisma و نقش محدود RLS در CI اجرا می‌شوند. ایمیج app از GHCR می‌آید؛ Edge روی سرور ساخته می‌شود. MQTT پورت عمومی ندارد.
