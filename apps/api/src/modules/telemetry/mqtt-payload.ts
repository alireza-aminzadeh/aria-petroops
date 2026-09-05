import { mqttReadingSchema, MqttReading } from '@aria/contracts';

export const MQTT_TOPIC_PREFIX = 'petroops/v1/';

export function parseMqttIngest(topic: string, payload: Buffer | string): MqttReading {
  const fromTopic = topic.startsWith(MQTT_TOPIC_PREFIX)
    ? topic.slice(MQTT_TOPIC_PREFIX.length).replace(/^tags\//, '')
    : undefined;
  if (fromTopic?.startsWith('.')) {
    throw new Error('reserved MQTT topic');
  }
  const raw = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8')) as Record<
    string,
    unknown
  >;
  return mqttReadingSchema.parse({
    ...raw,
    tag: raw.tag ?? fromTopic,
  });
}
