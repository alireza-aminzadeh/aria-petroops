#!/bin/sh
set -eu
for path in / /login /health /alarms /energy /ai /api/ai/status; do
  code=$(curl -sS -o /tmp/body -w '%{http_code}' -m 15 "https://petro.aria-ai.ir$path")
  echo "$path $code"
done
