# ۷) امنیت — Aria PetroOps

## ۷.۱ اسنپ‌شات وضعیت فعلی سرور (بررسی‌شده در ۱۴۰۵/۰۶/۱۴ از طریق SSH read-only)

| مورد | وضعیت فعلی | اقدام لازم |
|---|---|---|
| IP / Hostname | `91.107.149.251` / `petro` | — |
| OS | Ubuntu 26.04.1 LTS، کرنل `7.0.0-30-generic` | به‌روز نگه‌داشتن با `unattended-upgrades` |
| فایروال (UFW) | نصب شده ولی **غیرفعال** | ⚠️ فعال‌سازی با قوانین محدود (بخش ۷.۲) |
| پورت‌های باز فعلی | فقط `22` (روی `0.0.0.0`) | بعد از نصب Docker، فقط `80`/`443` هم اضافه شود |
| Docker | **نصب نشده** | نصب Docker Engine + Compose plugin ([`08-infrastructure-deployment.md`](08-infrastructure-deployment.md)) |
| کاربر Deploy اختصاصی | وجود ندارد | ⚠️ ساخت کاربر `deploy` غیر-root (مشابه SafeOps، کلید SSH جدا) |
| Swap | `0B` | توصیه: swap با حجم کم (۱ گیگ) |

## ۷.۲ قوانین فایروال پیشنهادی (UFW) — با یک تفاوت مهم نسبت به SafeOps
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
> **نکتهٔ حیاتی برای فاز ۲ (وقتی OPC-UA/MQTT/Modbus فعال شد):** این پروتکل‌ها **هرگز** از اینترنت عمومی در معرض دید قرار نمی‌گیرند. طبق سند مرجع (بخش ۸.۶): «کانکتورهای OT فقط‌خواندنی و یک‌طرفه از DMZ طبق IEC 62443؛ ممنوعیت مطلق نوشتن مستقیم روی DCS/PLC از سامانه IT». یعنی این سرور (`petro`) هرگز مستقیماً به شبکهٔ OT کارخانه وصل نمی‌شود؛ داده از یک Edge Agent محلی در سایت مشتری (داخل شبکهٔ ایزوله OT) فقط به‌صورت **خروجی (outbound-only)** به این سرور push می‌شود، نه برعکس.

## ۷.۳ کاربر Deploy اختصاصی
همان الگوی SafeOps:
```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# کلید SSH اختصاصی این پروژه (متفاوت از SafeOps و از کلید شخصی)
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```
در GitHub Secrets: `PETROOPS_SSH_USER=deploy`.

## ۷.۴ چک‌لیست امنیتی سرویس‌ها (اعمال‌شده در `docker-compose.yml`)
| مورد | وضعیت |
|---|---|
| Redis با `--requirepass` | ✅ |
| Postgres/Redis بدون expose به `0.0.0.0` | ✅ فقط `127.0.0.1` در override محلی |
| کاربر non-root در ایمیج نهایی | ✅ `USER appuser` (uid 1000) در `Dockerfile` |
| Tag نسخه‌دار (نه `:latest`) | ✅ `nginx:1.27-alpine`, `redis:7.4-alpine`, `timescale/timescaledb:2.17.2-pg16`, `node:22-alpine` |
| `restart: unless-stopped` | ✅ |
| سقف حافظه هر سرویس | ✅ |
| Secrets فقط از `.env` | ✅ |

## ۷.۵ احراز هویت و مجوزها
- JWT (`@nestjs/jwt` + Passport) با `JWT_EXPIRES_IN=8h` + Refresh Token با `JWT_REFRESH_EXPIRES_IN=7d`.
- ورود با **نام کاربری** (ستون `users.username`) یا ایمیل.
- **کاربر راه‌انداز مشترک با SafeOps:** نام کاربری `alireza`. رمز لوکال `alireza`؛ رمز Production (یکسان در هر دو سامانه) `Aria7x!Alireza#Ops2026`. بازنویسی با `SEED_ALIREZA_PASSWORD`.
- RBAC پایه: `RELIABILITY_ENGINEER`, `MAINTENANCE_PLANNER`, `ENERGY_MANAGER`, `ADMIN`.
- **ABAC واقعی با CASL** (نه فقط RBAC): تا قبل از این نسخه، `CaslAbilityFactory` فقط نقش کاربر را در برابر *نوع* subject می‌سنجید (`can('start', 'WorkOrder')`) — یعنی یک تکنسین می‌توانست دستورکار تخصیص‌داده‌شده به تکنسین دیگر را هم START/SUBMIT کند (فقط نقش چک می‌شد، نه مالکیت). حالا `WorkOrderService.transition()` با `subject('WorkOrder', record)` نمونهٔ واقعی را تگ می‌کند و شرط‌های CASL واقعاً فیلد‌محور هستند:
  - تکنسین: فقط روی WorkOrder ای که `assignedToId` آن برابر `user.id` (و هم‌تننت) باشد می‌تواند START/SUBMIT بزند.
  - برنامه‌ریز/ADMIN: assign/approve/reject/close/cancel — با شرط هم‌تننتی.
  - در همین بازبینی یک باگ جدا هم کشف/رفع شد: گذار `REJECT` (رد کردن کار ناقص توسط برنامه‌ریز) در فهرست قدیمی hardcoded اصلاً نبود و فقط ADMIN می‌توانست آن را بزند.
  - تست‌ها: `common/casl/casl-ability.factory.spec.ts` (شرط‌های سطح-instance) و `modules/work-order/work-order.service.spec.ts` (اجرای end-to-end با XState واقعی، شامل رد یک تکنسین غیرمرتبط).
- WebSocket Gateway نیز باید JWT را در Handshake اعتبارسنجی کند (`@UseGuards(WsJwtGuard)`), نه فقط REST.

## ۷.۶ OWASP Top 10 — اقدامات مشخص
| ریسک | اقدام در NestJS |
|---|---|
| SQL Injection | Prisma (Parameterized Query خودکار، بدون Raw SQL دستی) |
| XSS | فرانت React (auto-escape JSX)؛ API فقط JSON برمی‌گرداند |
| Broken Access Control | CASL Guard روی هر Controller حساس + بررسی `tenant_id` |
| Sensitive Data Exposure | HTTPS اجباری، `bcrypt`/`argon2` برای رمز، `.env` gitignored |
| Security Misconfiguration | `NODE_ENV=production` (Stack trace غیرفعال)، هدرهای امنیتی `helmet` |
| Insecure Deserialization | `class-transformer` با `whitelist: true` در `ValidationPipe` (رد فیلدهای غیرمنتظره) |

## ۷.۷ نکتهٔ خاص PetroOps: امنیت WebSocket
- محدودسازی CORS دقیق (`WS_CORS_ORIGIN` فقط `https://petro.aria-ai.ir`، نه `*`).
- Rate limiting روی تعداد پیام‌های ورودی هر کلاینت (پیشگیری از DoS ساده روی Gateway).
- در فاز ۲ (اتصال واقعی MQTT/OPC-UA)، این جریان **کاملاً یک‌طرفه ورودی** خواهد بود (Edge Agent → این سرور)؛ این سرور هرگز فرمان کنترلی به تجهیز صنعتی ارسال نمی‌کند.
- **ایزولاسیون تننت روی Socket.IO (رفع‌شده):** `TelemetryGateway` قبلاً بعد از احراز هویت JWT در handshake، broadcast تگ‌ها را با `server.emit` سراسری انجام می‌داد — یعنی یک کاربر تننت A داده‌های زنده (و آنومالی) تننت B را هم می‌دید. حالا هر client بعد از اتصال به room اختصاصی تننت خودش (`tenant:{tenantId}`) join می‌شود و همهٔ broadcast ها (`tag:update` و `anomaly:update`) فقط با `server.to(room).emit(...)` به همان room ارسال می‌شوند.

## ۷.۸ پشتیبان‌گیری و مانیتورینگ
مشابه SafeOps (`pg_dump` روزانه + `docker stats`) — جزئیات در [`08-infrastructure-deployment.md`](08-infrastructure-deployment.md#۸۷-استراتژی-بکآپ).

## ۷.۹ سخت‌سازی چندمستأجری (RLS در سطح پایگاه‌داده)

**لایهٔ اول (همیشه فعال، مستقل از هرچه در ادامه می‌آید):** هر سرویس در کد صریحاً `where: { tenantId: user.tenantId }` می‌گذارد (مثلاً `WorkOrderService`). این لایه هرگز حذف نشده و اصلی‌ترین مکانیزم ایزولاسیون است.

**لایهٔ دوم (سخت‌سازی، اضافه‌شده در این نسخه):** Migration های `20260905000000_init` و `20260905200000_phase2_telemetry_ai` از ابتدا پالیسی‌های `ENABLE ROW LEVEL SECURITY` روی جدول‌های تننت‌دار تعریف کرده بودند، ولی دو باگ باعث می‌شد این پالیسی‌ها در عمل **هیچ اثری نداشته باشند**:

1. اتصال برنامه با `DATABASE_URL` (همان نقش سوپریوزر migration که `BYPASSRLS` دارد) انجام می‌شد.
2. حتی اگر با نقش محدود وصل می‌شد، `app.tenant_id` هیچ‌وقت در کوئری‌های Prisma واقعاً `set_config` نمی‌شد.

هر دو با migration های `20260906010000_app_runtime_role_rls_hardening` و `20260906020000_rls_empty_guc_cast_fix` + کد زیر رفع شدند:

| بخش | فایل | نقش |
|---|---|---|
| نقش محدود DB (بدون `BYPASSRLS`/`SUPERUSER`) | `prisma/provision-app-role.js` | بعد از هر `migrate deploy` در `api-prod.sh` صدا زده می‌شود؛ ایدمپوتنت؛ فقط اگر `APP_DB_PASSWORD` در `.env` پر باشد (در غیر این صورت no-op، رفتار قبلی حفظ می‌شود) |
| ست‌کردن `app.tenant_id` هر request | `src/common/tenant/tenant-context.service.ts` + `tenant-context.interceptor.ts` | `AsyncLocalStorage` + `APP_INTERCEPTOR` سراسری؛ `tenantId` را از `request.user` (همان که `JwtStrategy` ست می‌کند) می‌خواند |
| اعمال روی هر کوئری Prisma | `src/prisma/prisma.service.ts` | Prisma Client Extension (`$allOperations`)؛ هر عملیات را داخل یک تراکنش با `SELECT set_config('app.tenant_id', …, true)` روی یک کلاینت خامِ جدا (بدون extension، برای پیشگیری از recursion) اجرا می‌کند |

**رفتار fail-open، نه fail-closed:** اگر context تننتی موجود نباشد (مثلاً یک job پس‌زمینه یا وقتی `APP_DB_PASSWORD` ست نشده)، پالیسی RLS اجازهٔ عبور می‌دهد (نه رد) — یعنی این سخت‌سازی هرگز نمی‌تواند چیزی را که امروز کار می‌کند بشکند؛ فقط وقتی *هم* نقش محدود *و هم* context تننت هر دو موجود باشند، دفاع لایهٔ دوم واقعاً فعال است.

**اعتبارسنجی:** یک تست end-to-end واقعی (Nest + Fastify + نقش محدود واقعی روی Postgres، بدون mock) نوشته و اجرا شد که یک درخواست HTTP کامل را برای دو تننت مختلف و یک حالت بدون تننت شبیه‌سازی می‌کرد و تأیید کرد که هرکدام فقط ردیف‌های خودشان را می‌بینند (جزئیات فقط در تاریخچهٔ توسعه؛ فایل‌های پروب موقت بعد از تأیید حذف شدند). تست‌های واحد دائمی: `src/common/tenant/tenant-context.service.spec.ts` و `tenant-context.interceptor.spec.ts`.

**فعال‌سازی در Production:** در `.env`، سه مقدار `APP_DB_ROLE`/`APP_DB_PASSWORD`/`APP_DATABASE_URL` را پر کنید (نمونه در `.env.example`؛ `infra/scripts/generate-env.sh` این‌ها را خودکار تولید می‌کند). خالی‌گذاشتن آن‌ها یعنی این سخت‌سازی غیرفعال می‌ماند و فقط لایهٔ اول (کد) در کار است.
