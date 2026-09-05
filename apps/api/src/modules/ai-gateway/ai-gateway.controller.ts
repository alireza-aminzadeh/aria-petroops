import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
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

@Controller()
@UseGuards(JwtAuthGuard)
export class AiGatewayController {
  constructor(
    @Inject('AiGatewayPort') private readonly gateway: AiGatewayPort,
    private readonly prisma: PrismaService,
  ) {}

  @Get('ai/status')
  status() {
    return {
      enabled: this.gateway.isEnabled(),
      available: false,
      message: 'سرویس AI Gateway مرکزی هنوز فعال نشده است. این پنل در فاز ۲ وصل می‌شود.',
    };
  }

  @Get('anomaly-events')
  events() {
    return { status: 'not_configured', items: [] };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('ai/anomaly-explain')
  async explain(
    @CurrentUser() user: AuthUser,
    @Body() body: { query?: string; eventId?: string },
    @Res() reply: FastifyReply,
  ) {
    const answer = await this.gateway.explainAnomaly(body.eventId ?? '');
    await this.prisma.aiQueryLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        queryText: body.query ?? body.eventId ?? '',
        status: 'unavailable',
      },
    });
    return reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      statusCode: 503,
      message: answer.unavailableReason,
      available: false,
    });
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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
        status: 'unavailable',
      },
    });
    return reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      statusCode: 503,
      message: answer.unavailableReason,
      available: false,
    });
  }

  @Get('ai/rul')
  async rul(
    @Query('equipmentId') equipmentId: string,
    @Res() reply: FastifyReply,
  ) {
    const estimate = await this.gateway.estimateRemainingUsefulLife(
      equipmentId ?? '',
    );
    return reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({
      statusCode: 503,
      message: estimate.unavailableReason,
      available: false,
      remainingDays: estimate.remainingDays,
    });
  }
}
