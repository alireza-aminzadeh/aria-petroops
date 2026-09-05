#!/bin/sh
set -eu
KEY=${1:-}
if [ -z "$KEY" ]; then
  echo "usage: $0 <hex-key>" >&2
  exit 1
fi
cd /opt/aria-petroops

upsert() {
  name=$1
  value=$2
  if grep -q "^${name}=" .env; then
    sed -i "s|^${name}=.*|${name}=${value}|" .env
  else
    printf '%s=%s\n' "$name" "$value" >> .env
  fi
}

upsert SAFEOPS_ENABLED true
upsert SAFEOPS_API_URL https://hse.aria-ai.ir
upsert SAFEOPS_API_KEY "$KEY"
upsert SAFEOPS_TIMEOUT_MS 8000
chmod 600 .env
chown deploy:deploy .env 2>/dev/null || true

sudo -u deploy docker compose -f docker-compose.yml up -d --force-recreate --no-deps app
echo "requeue skipped SafeOps deliveries"
sudo -u deploy docker compose -f docker-compose.yml exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "UPDATE integration_deliveries SET status = '\''pending'\'', last_error = NULL WHERE target = '\''safeops'\'' AND status = '\''skipped'\'';"'
echo "waiting for app health"
i=0
while [ "$i" -lt 24 ]; do
  if curl -sf -m 8 https://petro.aria-ai.ir/health >/dev/null; then
    echo "petro app healthy"
    break
  fi
  i=$((i + 1))
  sleep 5
done
sudo -u deploy docker compose -f docker-compose.yml ps app
