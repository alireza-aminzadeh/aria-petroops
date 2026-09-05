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
- ABAC با **CASL** (طبق سند مرجع، بخش ۸.۶) برای تصمیم‌های ریزدانه (مثلاً فقط برنامه‌ریز نت می‌تواند Work Order را approve کند).
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

## ۷.۸ پشتیبان‌گیری و مانیتورینگ
مشابه SafeOps (`pg_dump` روزانه + `docker stats`) — جزئیات در [`08-infrastructure-deployment.md`](08-infrastructure-deployment.md#۸۷-استراتژی-بکآپ).
