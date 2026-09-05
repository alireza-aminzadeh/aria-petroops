#!/bin/sh
set -eu
cd /app
export CI=true

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
exec node dist/main.js
