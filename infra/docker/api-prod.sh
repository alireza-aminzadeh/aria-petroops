#!/bin/sh
set -eu
cd /app
export PATH="/app/apps/api/node_modules/.bin:/app/node_modules/.bin:${PATH}"
run_prisma() {
  if command -v prisma >/dev/null 2>&1; then
    prisma "$@"
  elif [ -f /app/node_modules/prisma/build/index.js ]; then
    node /app/node_modules/prisma/build/index.js "$@"
  elif [ -f /app/apps/api/node_modules/prisma/build/index.js ]; then
    node /app/apps/api/node_modules/prisma/build/index.js "$@"
  else
    echo "prisma CLI not found in image" >&2
    exit 1
  fi
}

run_prisma generate --schema=/app/prisma/schema.prisma
run_prisma migrate deploy --schema=/app/prisma/schema.prisma
exec node dist/main.js
