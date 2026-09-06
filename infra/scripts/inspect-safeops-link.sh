#!/bin/sh
set -eu
cd /opt/aria-petroops
echo '---env keys---'
grep -E '^(SAFEOPS_|IMAGE_TAG)=' .env | sed 's/\(KEY=\).*/\1***/'
echo '---ps---'
sudo -u deploy docker compose -f docker-compose.yml ps
echo '---db---'
sudo -u deploy docker compose -f docker-compose.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT status, COUNT(*) FROM integration_deliveries GROUP BY 1;" -c "SELECT status, COUNT(*) FROM anomaly_events GROUP BY 1;"'
echo '---curl hse---'
curl -sS -o /dev/null -w 'hse_health:%{http_code}\n' -m 15 https://hse.aria-ai.ir/api/health || echo 'hse_health:fail'
