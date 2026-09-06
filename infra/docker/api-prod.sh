#!/bin/sh
set -eu
cd /app
export CI=true
mkdir -p /app/node_modules/@aria
ln -sfn /app/packages/contracts /app/node_modules/@aria/contracts

PRISMA_JS=""
if [ -f /app/node_modules/prisma/build/index.js ]; then
  PRISMA_JS=/app/node_modules/prisma/build/index.js
elif [ -f /app/apps/api/node_modules/prisma/build/index.js ]; then
  PRISMA_JS=/app/apps/api/node_modules/prisma/build/index.js
else
  PRISMA_JS="$(find /app/node_modules -path '*/prisma/build/index.js' 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$PRISMA_JS" ]; then
  echo "prisma CLI not found in image" >&2
  exit 1
fi

node "$PRISMA_JS" migrate deploy --schema=/app/prisma/schema.prisma

# سخت‌سازی RLS (لایهٔ دوم دفاعی) — اختیاری: فقط اگر APP_DB_PASSWORD در .env ست
# شده باشد نقش محدود دیتابیس را می‌سازد/همگام می‌کند؛ در غیر این صورت no-op
# است (رفتار امروز حفظ می‌شود). اگر APP_DB_PASSWORD ست شده و این مرحله خطا
# بدهد، طبق «set -eu» deploy همینجا متوقف می‌شود تا برنامه هرگز با سخت‌سازی
# نیمه‌کاره/شکسته بالا نیاید.
node /app/prisma/provision-app-role.js

exec node dist/main.js
