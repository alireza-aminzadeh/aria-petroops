#!/bin/sh
set -eu
PG=$(openssl rand -hex 24)
RD=$(openssl rand -hex 24)
JWT=$(openssl rand -hex 32)
MQTT=$(openssl rand -hex 24)
cat > /root/aria-petroops.env <<EOF
NODE_ENV=production
PORT=3000
APP_URL=https://petro.aria-ai.ir
IMAGE_TAG=latest
POSTGRES_DB=aria_petroops
POSTGRES_USER=aria_petroops
POSTGRES_PASSWORD=${PG}
DATABASE_URL=postgresql://aria_petroops:${PG}@postgres:5432/aria_petroops?schema=public
REDIS_PASSWORD=${RD}
REDIS_URL=redis://:${RD}@redis:6379
JWT_SECRET=${JWT}
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
AI_GATEWAY_ENABLED=true
AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
AI_GATEWAY_TIMEOUT_MS=8000
INDUSTRIAL_INGESTION_ENABLED=true
MQTT_BROKER_URL=mqtt://mqtt:1883
MQTT_USERNAME=petroops
MQTT_PASSWORD=${MQTT}
OPCUA_ENDPOINT_URL=
SAFEOPS_ENABLED=false
SAFEOPS_API_URL=https://hse.aria-ai.ir
SAFEOPS_API_KEY=
SAFEOPS_TIMEOUT_MS=8000
WS_CORS_ORIGIN=https://petro.aria-ai.ir
EOF
chmod 600 /root/aria-petroops.env
echo "wrote /root/aria-petroops.env"
