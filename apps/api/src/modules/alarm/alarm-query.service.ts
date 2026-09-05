import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { computeIsa182 } from './isa-18-2';

@Injectable()
export class AlarmQueryService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, state?: string) {
    return this.prisma.alarmEvent.findMany({
      where: {
        tenantId: user.tenantId,
        ...(state ? { state } : {}),
      },
      include: {
        tag: true,
        equipment: { select: { id: true, tagNumber: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
  }

  async kpis(user: AuthUser, hours = 8) {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - hours * 3600_000);
    const rows = await this.prisma.alarmEvent.findMany({
      where: {
        tenantId: user.tenantId,
        startedAt: { lte: windowEnd },
        OR: [{ clearedAt: null }, { clearedAt: { gte: windowStart } }],
      },
    });
    return computeIsa182(
      rows.map((row) => ({
        tagId: row.tagId,
        startedAt: row.startedAt,
        clearedAt: row.clearedAt,
      })),
      windowStart,
      windowEnd,
    );
  }
}
