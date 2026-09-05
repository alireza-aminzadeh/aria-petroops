import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { TelemetryIngestService } from './telemetry-ingest.service';
import { parseMqttIngest } from './mqtt-payload';

@Injectable()
export class MqttIngestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttIngestService.name);
  private client?: MqttClient;
  connected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly ingest: TelemetryIngestService,
  ) {}

  isEnabled() {
    return this.config.get('INDUSTRIAL_INGESTION_ENABLED') === 'true';
  }

  async onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.log('MQTT ingest disabled (INDUSTRIAL_INGESTION_ENABLED!=true)');
      return;
    }
    const url = this.config.get<string>('MQTT_BROKER_URL');
    if (!url) {
      this.logger.warn('MQTT_BROKER_URL empty; industrial ingest not started');
      return;
    }
    this.client = mqtt.connect(url, {
      username: this.config.get<string>('MQTT_USERNAME') ?? 'petroops',
      password: this.config.get<string>('MQTT_PASSWORD') ?? '',
      reconnectPeriod: 4000,
      connectTimeout: 8000,
      clientId: `petroops-api-${process.pid}`,
    });
    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('MQTT connected; subscribing petroops/v1/#');
      this.client?.subscribe('petroops/v1/#', { qos: 1 });
    });
    this.client.on('reconnect', () => {
      this.connected = false;
    });
    this.client.on('close', () => {
      this.connected = false;
    });
    this.client.on('error', (error) => {
      this.logger.warn(`MQTT error: ${error.message}`);
    });
    this.client.on('message', (topic, payload) => {
      void this.onMessage(topic, payload);
    });
  }

  async onModuleDestroy() {
    this.client?.end(true);
  }

  private async onMessage(topic: string, payload: Buffer) {
    try {
      const reading = parseMqttIngest(topic, payload);
      const time = new Date(reading.ts);
      if (Number.isNaN(time.getTime())) {
        return;
      }
      await this.ingest.ingest({
        tagName: reading.tag,
        time,
        value: reading.value,
        quality: reading.quality,
      });
    } catch (error) {
      this.logger.debug(
        `MQTT payload ignored on ${topic}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
