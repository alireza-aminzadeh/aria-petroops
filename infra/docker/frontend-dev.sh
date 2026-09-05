#!/bin/sh
set -eu
cd /app
corepack enable
pnpm install --no-frozen-lockfile
exec pnpm --filter @aria/frontend dev --host 0.0.0.0 --port 5173
