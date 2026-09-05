import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import { MqttIngestService } from './modules/telemetry/mqtt-ingest.service';

@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttIngestService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'aria-petroops',
      db: 'up',
      mqtt: this.mqtt.isEnabled() ? (this.mqtt.connected ? 'up' : 'down') : 'disabled',
    };
  }
}
