import mqtt from 'mqtt';
import { samplePlant } from './plant.mjs';
import { startOpcua } from './opcua.mjs';

const broker = process.env.MQTT_BROKER_URL ?? 'mqtt://mqtt:1883';
const username = process.env.MQTT_USERNAME ?? 'petroops';
const password = process.env.MQTT_PASSWORD ?? '';
const intervalMs = Number(process.env.EDGE_INTERVAL_MS ?? 2000);

const client = mqtt.connect(broker, {
  username,
  password,
  reconnectPeriod: 4000,
  clientId: `petroops-edge-${process.pid}`,
});

function publish(reading) {
  const topic = `petroops/v1/${reading.tag}`;
  client.publish(
    topic,
    JSON.stringify({
      tag: reading.tag,
      ts: reading.ts ?? new Date().toISOString(),
      value: reading.value,
      quality: reading.quality ?? 0,
    }),
    { qos: 1 },
  );
}

client.on('connect', () => {
  console.log(`edge agent connected to ${broker} (outbound MQTT only)`);
});
client.on('error', (error) => {
  console.error('mqtt error', error.message);
});

const opcua = await startOpcua(publish);
if (opcua.mode !== 'opcua') {
  setInterval(() => {
    if (!client.connected) return;
    for (const sample of samplePlant()) {
      publish({ ...sample, ts: new Date().toISOString() });
    }
  }, intervalMs);
  console.log(`plant simulator publishing every ${intervalMs}ms`);
}
