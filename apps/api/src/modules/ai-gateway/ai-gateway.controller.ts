import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AiGatewayPort } from './ai-gateway.port';
import { WorkOrderService } from '../work-order/work-order.service';
import { TelemetryGateway } from '../telemetry/telemetry.gateway';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiGatewayController {
  constructor(
    @Inject('AiGatewayPort') private readonly gateway: AiGatewayPort,
    private readonly prisma: PrismaService,
    private readonly workOrders: WorkOrderService,
    private readonly telemetry: TelemetryGateway,
  ) {}

  @Get('ai/status')
  status() {
    const enabled = this.gateway.isEnabled();
    return {
      enabled,
      available: enabled,
      method: this.gateway.method(),
      message: enabled
        ? 'موتور on-prem فعال است: Isolation Forest + RUL مهندسی + بستهٔ دانش محلی. LSTM-AE مرکزی وقتی AI_GATEWAY_URL ست شود وصل می‌شود.'
        : 'سرویس AI Gateway غیرفعال است.',
    };
  }

  @Get('anomaly-events')
  async events(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    const items = await this.prisma.anomalyEvent.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        equipment: { select: { id: true, tagNumber: true, name: true, criticality: true } },
        tag: { select: { tagName: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: 100,
    });
    return { status: 'ok', items };
  }

  @Post('anomaly-events/:id/acknowledge')
  async acknowledge(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const event = await this.prisma.anomalyEvent.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!event) {
      return { statusCode: 404, message: 'رویداد یافت نشد.' };
    }
    const updated = await this.prisma.anomalyEvent.update({
      where: { id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
      include: { equipment: { select: { id: true, tagNumber: true } } },
    });
    // اگر یک اپراتور دیگر همین لحظه همین داشبورد را باز داشته باشد، وضعیت
    // «تأیید دیده‌شدن» را بدون رفرش دستی ببیند.
    this.telemetry.broadcastAnomalyEvent(user.tenantId, {
      id: updated.id,
      equipmentId: updated.equipmentId,
      equipmentTag: updated.equipment?.tagNumber,
      status: updated.status,
      score: updated.score,
      summary: updated.summary,
      detectedAt: updated.detectedAt,
    });
    return updated;
  }

  @Post('anomaly-events/:id/work-order')
  async openWorkOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const event = await this.prisma.anomalyEvent.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!event?.equipmentId) {
      return { statusCode: 404, message: 'رویداد یا تجهیز یافت نشد.' };
    }
    return this.workOrders.create(user, {
      equipmentId: event.equipmentId,
      description: event.summary ?? `دستور کار پیشنهادی از آنومالی ${id}`,
      priority: 'high',
    });
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('ai/anomaly-explain')
  async explain(
    @CurrentUser() user: AuthUser,
    @Body() body: { query?: string; eventId?: string },
    @Res() reply: FastifyReply,
  ) {
    const answer = await this.gateway.explainAnomaly(body.eventId ?? '', {
      query: body.query,
    });
    await this.prisma.aiQueryLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        queryText: body.query ?? body.eventId ?? '',
        responseText: answer.text,
        status: answer.available ? 'ok' : 'unavailable',
      },
    });
    const payload = {
      available: answer.available,
      text: answer.text,
      citations: answer.citations,
      message: answer.unavailableReason,
    };
    return reply
      .status(answer.available ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .send(payload);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('ai/knowledge-query')
  async knowledge(
    @CurrentUser() user: AuthUser,
    @Body() body: { query?: string },
    @Res() reply: FastifyReply,
  ) {
    const answer = await this.gateway.askKnowledgeBase(body.query ?? '');
    await this.prisma.aiQueryLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        queryText: body.query ?? '',
        responseText: answer.text,
        status: answer.available ? 'ok' : 'unavailable',
      },
    });
    return reply
      .status(answer.available ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .send({
        available: answer.available,
        text: answer.text,
        citations: answer.citations,
        message: answer.unavailableReason,
      });
  }

  @Get('ai/rul')
  async rul(
    @Query('equipmentId') equipmentId: string,
    @Res() reply: FastifyReply,
  ) {
    const estimate = await this.gateway.estimateRemainingUsefulLife(equipmentId ?? '');
    return reply
      .status(estimate.available ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .send({
        available: estimate.available,
        remainingDays: estimate.remainingDays,
        healthIndex: estimate.healthIndex,
        method: estimate.method,
        notes: estimate.notes,
        message: estimate.unavailableReason,
      });
  }
}
