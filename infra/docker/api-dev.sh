#!/bin/sh
set -eu
cd /app
corepack enable
pnpm install --no-frozen-lockfile
pnpm --filter @aria/api exec prisma generate
pnpm --filter @aria/api exec prisma migrate deploy
pnpm --filter @aria/api exec prisma db seed || true
exec pnpm --filter @aria/api start:dev
