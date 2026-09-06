#!/bin/sh
set -eu
cd /opt/aria-petroops
echo '---flags---'
sudo -u deploy docker compose -f docker-compose.yml exec -T app printenv SAFEOPS_ENABLED
sudo -u deploy docker compose -f docker-compose.yml exec -T app printenv SAFEOPS_API_URL
echo '---deliveries---'
sudo -u deploy docker compose -f docker-compose.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT status, COUNT(*) AS n FROM integration_deliveries GROUP BY 1 ORDER BY 1;"'
echo '---app log---'
sudo -u deploy docker compose -f docker-compose.yml logs --tail 40 app | grep -E 'SafeOps|safeops|delivery' || true
