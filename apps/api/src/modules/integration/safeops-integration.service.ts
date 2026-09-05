import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

export type SafeopsAnomalyPayload = {
  equipmentTag: string;
  eventId: string;
  score: number;
  detectedAt: string;
  summary: string | null;
  status: string;
};

@Injectable()
export class SafeopsIntegrationService {
  private readonly logger = new Logger(SafeopsIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  isEnabled() {
    return (
      this.config.get('SAFEOPS_ENABLED') === 'true' &&
      Boolean(this.config.get('SAFEOPS_API_KEY')) &&
      Boolean(this.config.get('SAFEOPS_API_URL'))
    );
  }

  async enqueueAnomaly(tenantId: string, payload: SafeopsAnomalyPayload) {
    await this.prisma.integrationDelivery.create({
      data: {
        tenantId,
        target: 'safeops',
        eventType: payload.status === 'open' ? 'anomaly.open' : 'anomaly.closed',
        payload,
        status: this.isEnabled() ? 'pending' : 'skipped',
        lastError: this.isEnabled() ? null : 'SAFEOPS_ENABLED=false',
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flush() {
    if (!this.isEnabled()) {
      return;
    }
    const url = this.config.get<string>('SAFEOPS_API_URL');
    const apiKey = this.config.get<string>('SAFEOPS_API_KEY') ?? '';
    if (!url) {
      return;
    }
    await this.prisma.integrationDelivery.updateMany({
      where: { target: 'safeops', status: 'skipped', lastError: 'SAFEOPS_ENABLED=false' },
      data: { status: 'pending', lastError: null },
    });
    const pending = await this.prisma.integrationDelivery.findMany({
      where: { target: 'safeops', status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const item of pending) {
      try {
        const response = await fetch(`${url.replace(/\/$/, '')}/api/integrations/petroops/anomalies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Aria-Api-Key': apiKey,
          },
          body: JSON.stringify(item.payload),
          signal: AbortSignal.timeout(
            Number(this.config.get('SAFEOPS_TIMEOUT_MS') ?? 8000),
          ),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await this.prisma.integrationDelivery.update({
          where: { id: item.id },
          data: { status: 'delivered', deliveredAt: new Date(), attempts: item.attempts + 1 },
        });
        const payload = item.payload as unknown as SafeopsAnomalyPayload;
        await this.prisma.anomalyEvent.updateMany({
          where: { id: payload.eventId },
          data: { notifiedSafeopsAt: new Date() },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`SafeOps delivery ${item.id} failed: ${message}`);
        await this.prisma.integrationDelivery.update({
          where: { id: item.id },
          data: {
            attempts: item.attempts + 1,
            lastError: message,
            status: item.attempts + 1 >= 8 ? 'failed' : 'pending',
          },
        });
      }
    }
  }
}
