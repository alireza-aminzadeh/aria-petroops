# ۸) زیرساخت و استقرار — Aria PetroOps

## ۸.۱ مشخصات دقیق سرور (بررسی‌شده از طریق SSH — ۱۴۰۵/۰۶/۱۴)

| مورد | مقدار واقعی |
|---|---|
| IP | `91.107.149.251` |
| Hostname | `petro` |
| OS | Ubuntu 26.04.1 LTS "Resolute Raccoon" |
| Kernel | `7.0.0-30-generic` |
| CPU | ۲ vCPU |
| RAM کل | ۳.۷ GiB |
| RAM آزاد در زمان بررسی | ۳.۳ GiB |
| Swap | ۰ (توصیه: افزودن ۱ گیگ) |
| دیسک | `/dev/sda1` — ۳۸ گیگ کل، ۳۵ گیگ آزاد |
| Docker | نصب نشده |
| Git | نصب شده |
| UFW | نصب شده، غیرفعال |
| پورت‌های باز | فقط `22` |

## ۸.۲ بودجهٔ حافظهٔ کانتینرها (فاز ۲)

| سرویس | Limit | Reservation |
|---|---|---|
| nginx | ۹۶M | ۴۸M |
| app (NestJS) | ۷۰۰M | ۳۵۰M |
| postgres (+TimescaleDB) | ۷۶۸M | ۳۸۴M |
| redis | ۲۰۰M | ۱۰۰M |
| mqtt (Mosquitto 2.0) | ۶۴M | ۳۲M |
| edge (شبیه‌ساز / OPC-UA read-only) | ۹۶M | ۴۸M |
| **جمع** | **۱۹۲۴M (~1.9GB)** | — |

Mosquitto به‌جای EMQX انتخاب شد تا روی ۲ vCPU / ۳.۷GiB جا شود. مسیر ارتقا به EMQX وقتی حجم تله‌متری رشد کند در همین فایل می‌ماند؛ پورت MQTT هرگز به `0.0.0.0` اکسپوز نمی‌شود.

> نسبت به SafeOps کمی به `app` بیشتر تخصیص داده شده (۷۰۰ در برابر ۶۴۰ مگ) چون Node.js/V8 و WebSocket connections معمولاً کمی سنگین‌تر از PHP-FPM عمل می‌کنند.

## ۸.۳ نصب Docker روی سرور (Ubuntu 26.04) — یکسان با SafeOps

```bash
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version
```

### Swap ایمنی
```bash
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### UFW
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## ۸.۴ استقرار اولیه

```bash
mkdir -p /opt/aria-petroops && cd /opt/aria-petroops
git clone https://github.com/alireza-aminzadeh/aria-petroops.git .
cp .env.example .env
nano .env   # پر کردن رمزهای واقعی

# اجرای Migration (Prisma) — کاربر alireza هنگام استارت Nest ساخته می‌شود
docker compose -f docker-compose.yml run --rm app node ./node_modules/prisma/build/index.js migrate deploy

docker compose -f docker-compose.yml up -d
# ورود Production: نام کاربری alireza / رمز از SEED_ALIREZA_PASSWORD در .env سرور
docker compose ps
docker compose logs -f app
```

## ۸.۵ گواهی SSL
DNS زیردامنهٔ `petro.aria-ai.ir` به `91.107.149.251` اشاره می‌کند. گواهی Let's Encrypt با webroot صادر می‌شود. Nginx تا قبل از وجود فایل گواهی فقط HTTP سرو می‌کند؛ بعد از صدور، کانتینر nginx را restart کنید تا `ssl.conf` فعال شود.

```bash
apt-get install -y certbot
certbot certonly --webroot -w /opt/aria-petroops/infra/certbot/www \
  -d petro.aria-ai.ir --email <email> --agree-tos --non-interactive

ln -s /etc/letsencrypt /opt/aria-petroops/infra/certbot/conf

echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/aria-petroops/docker-compose.yml exec nginx nginx -s reload" | crontab -
```

## ۸.۶ Local Dev روی Docker Desktop (ویندوز)
همان محیط بررسی‌شده برای SafeOps (`Docker version 29.7.2`، ~۴ گیگ رم به VM لینوکس) — یک نمونهٔ Docker Desktop می‌تواند هر دو پروژه را هم‌زمان (پورت‌های متفاوت) اجرا کند برای توسعهٔ محلی، حتی اگر Production روی دو سرور جدا باشد.

```powershell
cd c:\development\aria-ai-oil-gas\aria-petroops
Copy-Item .env.example .env
docker compose up --build -d
docker compose exec app npx prisma migrate dev
pnpm --filter @aria/api exec prisma db seed   # کاربر alireza / alireza
```

## ۸.۷ استراتژی بک‌آپ
```bash
docker compose exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > backup-$(date +%F).sql.gz
```
نگه‌داری ۷ نسخهٔ روزانه + انتقال به مقصد خارج از سرور.

## ۸.۸ Edge Agent (فاز ۲ — فعال)
کانتینر `edge` روی همین compose دادهٔ شبیه‌ساز واحد نمونه را با MQTT به Mosquitto می‌فرستد (فقط outbound). در سایت مشتری، همین ایمیج در DMZ با `OPCUA_ENDPOINT_URL` فقط‌خواندنی اجرا می‌شود. سرور `petro` هرگز به شبکهٔ OT وصل نمی‌شود و MQTT به `0.0.0.0` اکسپوز نیست.
