import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TelemetryGateway } from './telemetry.gateway';
import { AlarmService } from '../alarm/alarm.service';
import { EnergyIngestService } from '../energy/energy-ingest.service';

export type IngestReadingInput = {
  tagName: string;
  time: Date;
  value: number;
  quality?: number;
};

@Injectable()
export class TelemetryIngestService {
  private readonly logger = new Logger(TelemetryIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TelemetryGateway,
    private readonly alarms: AlarmService,
    private readonly energy: EnergyIngestService,
  ) {}

  async ingest(input: IngestReadingInput) {
    const tag = await this.prisma.tag.findUnique({
      where: { tagName: input.tagName },
      include: { equipment: { include: { unit: { include: { site: true } } } } },
    });
    if (!tag) {
      throw new NotFoundException(`تگ ${input.tagName} یافت نشد.`);
    }

    await this.prisma.sensorReading.upsert({
      where: { time_tagId: { time: input.time, tagId: tag.id } },
      update: { value: input.value, quality: input.quality ?? 0 },
      create: {
        time: input.time,
        tagId: tag.id,
        value: input.value,
        quality: input.quality ?? 0,
      },
    });

    this.gateway.broadcastTagUpdate(tag.id, input.value, input.time, tag.tagName);

    await this.alarms.observeReading({
      tenantId: tag.equipment.unit.site.tenantId,
      tag,
      value: input.value,
      time: input.time,
    });
    await this.energy.observeTagReading(tag.id, input.time, input.value);
    return tag;
  }

  async ingestMany(rows: IngestReadingInput[]) {
    let imported = 0;
    for (const row of rows) {
      try {
        await this.ingest(row);
        imported += 1;
      } catch (error) {
        this.logger.warn(
          `ingest skipped ${row.tagName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { imported };
  }
}
