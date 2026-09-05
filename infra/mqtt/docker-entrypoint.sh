#!/bin/sh
set -eu
if [ -z "${MQTT_PASSWORD:-}" ]; then
  echo "MQTT_PASSWORD is required" >&2
  exit 1
fi
USER_NAME="${MQTT_USERNAME:-petroops}"
mkdir -p /mosquitto/data
mosquitto_passwd -b -c /mosquitto/data/passwordfile "$USER_NAME" "$MQTT_PASSWORD"
chown -R mosquitto:mosquitto /mosquitto/data
chmod 640 /mosquitto/data/passwordfile
exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
