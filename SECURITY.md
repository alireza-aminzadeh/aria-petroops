# Security policy — Aria PetroOps

**Language:** English first, then فارسی.

## English

### Reporting

Private operational product. Report vulnerabilities via [aria-ai.ir](https://aria-ai.ir). Do not file public issues that contain exploits, OT dumps, or tokens.

### Never commit

| Class | Rule |
|---|---|
| Production passwords | `SEED_ALIREZA_PASSWORD` on the server only |
| `.env` | gitignored; `.env.example` has placeholders |
| MQTT / OPC credentials | Server env only |
| Historian exports | Not in git |
| `HF_TOKEN` | Not used in production path |

### Controls in this repo

| Control | Implementation |
|---|---|
| Published ports | Nginx 80/443 only in production compose |
| MQTT | Internal docker; not on `0.0.0.0` in the prod file |
| Redis | `--requirepass` |
| App user | `USER appuser` |
| AuthZ | JWT + CASL instance rules + tenant rooms on Socket.IO |
| OT | Edge outbound only; API never writes to DCS/PLC |
| RLS | Optional `APP_DB_PASSWORD` role without `BYPASSRLS` |
| Helmet / throttling | Fastify helmet; throttler on login and `/api/ai/*` |
| Pinned tags | `nginx:1.27-alpine`, `redis:7.4-alpine`, `timescale/timescaledb:2.17.2-pg16`, `node:22-alpine` |

### Out of scope today

SSO/MFA, historian connectors, sending live tag windows to public Hugging Face Spaces, fail-closed RLS as the only tenant mechanism (app filter is always on; DB RLS is opt-in).

Details: [`docs/en/07-security.md`](docs/en/07-security.md).

---

## فارسی

آسیب‌پذیری را از طریق [aria-ai.ir](https://aria-ai.ir) بگویید. رمز Production، `.env`، و دادهٔ Historian وارد git نشود. Edge فقط outbound است. MQTT در فایل Production به اینترنت bind نمی‌شود. RLS پایگاه‌داده لایهٔ دوم و opt-in است.
