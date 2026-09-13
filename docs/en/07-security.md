# 7) Security — Aria PetroOps

English technical manual. Persian original: [`../07-security.md`](../07-security.md).  
Policy: [`../../SECURITY.md`](../../SECURITY.md).

> The Persian §7.1 SSH snapshot is **historical** (first survey: UFW off, Docker missing). Live baseline is compose + CI. Re-verify the VPS for an audit.

## 7.1 Network

UFW: 22, 80, 443. **Never** publish MQTT, OPC-UA, Postgres, or Redis to the public internet. IEC 62443: OT connectors are read-only, outbound from a site DMZ. This VPS does not sit on the plant bus.

## 7.2 Identity

JWT 8h + refresh 7d. CASL **instance** rules for work orders (technician vs assignee). WS JWT on handshake. Tenant Socket.IO rooms.

Bootstrap `alireza`; production secret via `SEED_ALIREZA_PASSWORD`.

## 7.3 OWASP (selected)

Prisma parameterized queries; React XSS; CASL + tenant; helmet; `ValidationPipe` whitelist; `NODE_ENV=production`.

## 7.4 RLS (second layer)

`TenantContextInterceptor` + Prisma extension set `app.tenant_id`. `provision-app-role.js` creates a role without `BYPASSRLS` when `APP_DB_PASSWORD` is set. Opt-in; app filter remains the first layer. Fail-open if the restricted role is not provisioned — documented in Persian §7.9.

## 7.5 Container checklist

Pinned tags, non-root user, Redis password, memory limits, `restart: unless-stopped`.
