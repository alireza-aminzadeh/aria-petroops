# ۹) CI/CD — Aria PetroOps

## ۹.۱ نمای کلی پایپ‌لاین
فایل: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

```
push/PR → main
   │
   ├─▶ Job "test"            (pnpm lint + jest، روی هر push/PR)
   │
   ├─▶ Job "build-and-push"  (فقط روی main)
   │       → Build ایمیج Docker → Push به ghcr.io
   │
   └─▶ Job "deploy"          (فقط روی main)
           → SSH به 91.107.149.251 → docker compose pull && up -d
```

## ۹.۲ پیش‌نیازها روی GitHub
| مرحله | توضیح |
|---|---|
| ۱. ساخت ریپو | `gh repo create alireza-aminzadeh/aria-petroops --private --source=. --remote=origin` |
| ۲. GHCR | خودکار از `secrets.GITHUB_TOKEN` |
| ۳. کاربر `deploy` روی سرور | بخش [`07-security.md`](07-security.md#۷۳-کاربر-deploy-اختصاصی) |
| ۴. کلید SSH اختصاصی این پروژه | `ssh-keygen -t ed25519 -f petroops_deploy_key -C "ci-petroops"` (جدا از کلید SafeOps و کلید شخصی) |
| ۵. Environment `production` در GitHub | با Required Reviewers اختیاری |

## ۹.۳ GitHub Secrets لازم
| نام Secret | مقدار |
|---|---|
| `PETROOPS_SSH_HOST` | `91.107.149.251` |
| `PETROOPS_SSH_USER` | `deploy` |
| `PETROOPS_SSH_KEY` | محتوای کامل private key اختصاصی (`petroops_deploy_key`) |

```bash
gh secret set PETROOPS_SSH_HOST --body "91.107.149.251" -R alireza-aminzadeh/aria-petroops
gh secret set PETROOPS_SSH_USER --body "deploy" -R alireza-aminzadeh/aria-petroops
gh secret set PETROOPS_SSH_KEY  < petroops_deploy_key -R alireza-aminzadeh/aria-petroops
```

## ۹.۴ استراتژی برنچ
```
main                 ← همیشه قابل‌استقرار؛ فقط از طریق PR
 └─ feature/work-order-machine
 └─ feature/asset-isa95-model
 └─ fix/websocket-cors
```
Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) + Branch Protection Rule برای اجباری‌کردن سبز بودن Job «test» قبل از Merge.

## ۹.۵ اجرای اولین Deploy (دستی)
```bash
ssh deploy@91.107.149.251
mkdir -p /opt/aria-petroops && cd /opt/aria-petroops
git clone https://github.com/alireza-aminzadeh/aria-petroops.git .
cp .env.example .env && nano .env
docker compose -f docker-compose.yml up -d
```

## ۹.۶ Rollback
```bash
cd /opt/aria-petroops
git log --oneline -5
echo "IMAGE_TAG=<sha-پایدار>" > .env.deploy
docker compose -f docker-compose.yml up -d
```

## ۹.۷ تفاوت با پایپ‌لاین SafeOps
| مورد | SafeOps | PetroOps |
|---|---|---|
| زبان تست | PHPUnit | Jest |
| Setup Action | `shivammathur/setup-php` | `actions/setup-node` + Corepack |
| Package Manager | Composer | pnpm (Turborepo-aware: `pnpm --filter @aria/api ...`) |
| مسیر Deploy | `/opt/aria-safeops` | `/opt/aria-petroops` |
| Secrets Prefix | `SAFEOPS_*` | `PETROOPS_*` |

هر دو پایپ‌لاین کاملاً مستقل‌اند — Deploy یکی هرگز روی دیگری اثر نمی‌گذارد (سرورهای جدا، ریپوهای جدا، Secrets جدا).

## ۹.۸ محدودیت فعلی (صادقانه)
تا زمانی که مونوریپوی واقعی (`apps/api`, `package.json`, `pnpm-lock.yaml`) ساخته نشود، Job «test» و «build-and-push» قابل اجرا نیستند. این فایل CI/CD **قالب آماده** است.
