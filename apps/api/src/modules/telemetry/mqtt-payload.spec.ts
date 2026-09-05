import { parseMqttIngest } from './mqtt-payload';

describe('parseMqttIngest', () => {
  it('reads tag from payload', () => {
    const reading = parseMqttIngest(
      'petroops/v1/ignored',
      Buffer.from(JSON.stringify({ tag: 'P-101.VIBRATION', ts: '2026-09-05T10:00:00Z', value: 2.2 })),
    );
    expect(reading.tag).toBe('P-101.VIBRATION');
    expect(reading.value).toBe(2.2);
  });

  it('falls back to topic when payload omits tag', () => {
    const reading = parseMqttIngest(
      'petroops/v1/P-101.BEARING_TEMP',
      JSON.stringify({ ts: '2026-09-05T10:00:00Z', value: 71 }),
    );
    expect(reading.tag).toBe('P-101.BEARING_TEMP');
  });

  it('rejects broker health topics', () => {
    expect(() => parseMqttIngest('petroops/v1/.health', 'ping')).toThrow(/reserved/);
  });
});
