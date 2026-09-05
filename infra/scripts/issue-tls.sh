#!/bin/sh
set -eu
mkdir -p /opt/aria-petroops/infra/certbot/www \
  /opt/aria-petroops/infra/certbot/conf \
  /opt/aria-petroops/infra/certbot/work \
  /opt/aria-petroops/infra/certbot/logs
chown -R deploy:deploy /opt/aria-petroops/infra/certbot

certbot certonly --webroot \
  -w /opt/aria-petroops/infra/certbot/www \
  --config-dir /opt/aria-petroops/infra/certbot/conf \
  --work-dir /opt/aria-petroops/infra/certbot/work \
  --logs-dir /opt/aria-petroops/infra/certbot/logs \
  -d petro.aria-ai.ir \
  --email alireza-aminzadeh@users.noreply.github.com \
  --agree-tos --non-interactive --keep-until-expiring

ls -la /opt/aria-petroops/infra/certbot/conf/live/petro.aria-ai.ir/

cd /opt/aria-petroops
sudo -u deploy -H docker compose -f docker-compose.yml restart nginx
sleep 3
docker compose -f /opt/aria-petroops/docker-compose.yml logs --tail 15 nginx

# renew hook
CRON='0 3 * * * certbot renew --quiet --config-dir /opt/aria-petroops/infra/certbot/conf --work-dir /opt/aria-petroops/infra/certbot/work --logs-dir /opt/aria-petroops/infra/certbot/logs --deploy-hook "docker compose -f /opt/aria-petroops/docker-compose.yml restart nginx"'
(crontab -l 2>/dev/null | grep -v 'aria-petroops' || true; echo "$CRON") | crontab -
echo "certbot done"
