import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { scoreEquipmentSeries } from '../ai-gateway/ml/score-equipment';
import { SafeopsIntegrationService } from '../integration/safeops-integration.service';
import { TelemetryGateway } from '../telemetry/telemetry.gateway';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safeops: SafeopsIntegrationService,
    private readonly telemetry: TelemetryGateway,
  ) {}

  @Cron('*/20 * * * * *')
  async scan() {
    const equipment = await this.prisma.equipment.findMany({
      include: {
        tags: true,
        unit: { include: { site: true } },
      },
    });
    for (const item of equipment) {
      if (item.tags.length === 0) continue;
      try {
        await this.scoreOne(item);
      } catch (error) {
        this.logger.warn(
          `anomaly scan ${item.tagNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async scoreOne(
    equipment: Prisma.EquipmentGetPayload<{
      include: { tags: true; unit: { include: { site: true } } };
    }>,
  ) {
    const series = [];
    for (const tag of equipment.tags) {
      const readings = await this.prisma.sensorReading.findMany({
        where: { tagId: tag.id },
        orderBy: { time: 'desc' },
        take: 180,
      });
      series.push({
        tagName: tag.tagName,
        values: readings.reverse().map((row) => row.value),
      });
    }
    const tenantId = equipment.unit.site.tenantId;
    const result = scoreEquipmentSeries(series);
    if (!result?.isAnomaly) {
      await this.releaseIfClear(tenantId, equipment);
      return;
    }

    const recent = await this.prisma.anomalyEvent.findFirst({
      where: {
        equipmentId: equipment.id,
        status: { in: ['open', 'acknowledged'] },
        detectedAt: { gte: new Date(Date.now() - 15 * 60_000) },
      },
      orderBy: { detectedAt: 'desc' },
    });
    if (recent) {
      const summary = this.summary(equipment.tagNumber, result.score, result.contributors[0]?.tagName);
      await this.prisma.anomalyEvent.update({
        where: { id: recent.id },
        data: {
          score: result.score,
          contributors: result.contributors,
          summary,
        },
      });
      if (!recent.notifiedSafeopsAt) {
        await this.safeops.enqueueAnomaly(tenantId, {
          equipmentTag: equipment.tagNumber,
          eventId: recent.id,
          score: result.score,
          detectedAt: recent.detectedAt.toISOString(),
          summary,
          status: 'open',
        });
      }
      this.telemetry.broadcastAnomalyEvent(tenantId, {
        id: recent.id,
        equipmentId: equipment.id,
        equipmentTag: equipment.tagNumber,
        status: recent.status,
        score: result.score,
        summary,
        detectedAt: recent.detectedAt,
      });
      return;
    }

    const topTag = await this.prisma.tag.findFirst({
      where: { tagName: result.contributors[0]?.tagName },
    });
    const created = await this.prisma.anomalyEvent.create({
      data: {
        tenantId,
        equipmentId: equipment.id,
        tagId: topTag?.id,
        score: result.score,
        status: 'open',
        method: result.method,
        contributors: result.contributors,
        summary: this.summary(equipment.tagNumber, result.score, result.contributors[0]?.tagName),
      },
    });
    await this.safeops.enqueueAnomaly(tenantId, {
      equipmentTag: equipment.tagNumber,
      eventId: created.id,
      score: result.score,
      detectedAt: created.detectedAt.toISOString(),
      summary: created.summary,
      status: created.status,
    });
    this.telemetry.broadcastAnomalyEvent(tenantId, {
      id: created.id,
      equipmentId: equipment.id,
      equipmentTag: equipment.tagNumber,
      status: created.status,
      score: created.score,
      summary: created.summary,
      detectedAt: created.detectedAt,
    });
    this.logger.log(`open anomaly ${equipment.tagNumber} score=${result.score.toFixed(3)}`);
  }

  private async releaseIfClear(
    tenantId: string,
    equipment: Prisma.EquipmentGetPayload<{
      include: { tags: true; unit: { include: { site: true } } };
    }>,
  ) {
    const open = await this.prisma.anomalyEvent.findMany({
      where: { equipmentId: equipment.id, status: { in: ['open', 'acknowledged'] } },
    });
    for (const event of open) {
      const closedSummary = `آنومالی ${equipment.tagNumber} برطرف شد.`;
      await this.prisma.anomalyEvent.update({
        where: { id: event.id },
        data: { status: 'closed' },
      });
      await this.safeops.enqueueAnomaly(tenantId, {
        equipmentTag: equipment.tagNumber,
        eventId: event.id,
        score: event.score ?? 0,
        detectedAt: new Date().toISOString(),
        summary: closedSummary,
        status: 'closed',
      });
      this.telemetry.broadcastAnomalyEvent(tenantId, {
        id: event.id,
        equipmentId: equipment.id,
        equipmentTag: equipment.tagNumber,
        status: 'closed',
        score: event.score,
        summary: closedSummary,
        detectedAt: new Date(),
      });
      this.logger.log(`closed anomaly ${equipment.tagNumber}`);
    }
  }

  private summary(tagNumber: string, score: number, topTag?: string) {
    return `Isolation Forest روی ${tagNumber} امتیاز ${score.toFixed(2)} داد` +
      (topTag ? `؛ بیشترین سهم از ${topTag}.` : '.');
  }
}
