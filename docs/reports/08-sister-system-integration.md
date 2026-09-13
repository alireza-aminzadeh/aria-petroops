# Report 08 — Sister-system integration (SafeOps)

**Language:** English first, then فارسی.  
**Peer:** https://github.com/alireza-aminzadeh/aria-safeops

## English

### Outbox

| Item | Detail |
|---|---|
| Table | `IntegrationDelivery` |
| Target | `POST /api/integrations/petroops/anomalies` on SafeOps |
| Key | `equipment_tag` |
| Enable | `SAFEOPS_ENABLED=true` plus SafeOps URL/token in server `.env` |
| Default | **false** |

When enabled, open anomalies create holds that block SafeOps PTW/MOC on that tag (create and activate/resume/implementation).

### Not built

MOC linked to equipment UUID (not only tag string), incident ↔ anomaly, permit load → TAR plan, shared Keycloak.

### Caution

Turning the flag on against a missing SafeOps will accumulate outbox rows. Enabling it on a demo tag will **stop** permit activation in SafeOps — intended.

---

## فارسی

Outbox آنومالی را به SafeOps می‌فرستد. پیش‌فرض خاموش است. پیوند شناسهٔ دارایی، حادثه و TAR هنوز نیست.
