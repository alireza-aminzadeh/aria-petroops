import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluateAlarmLimits } from './isa-18-2';

type ObserveInput = {
  tenantId: string;
  tag: {
    id: string;
    tagName: string;
    equipmentId: string;
    alarmLl?: number | null;
    alarmLo?: number | null;
    alarmHi?: number | null;
    alarmHh?: number | null;
  };
  value: number;
  time: Date;
};

@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);

  constructor(private readonly prisma: PrismaService) {}

  async observeReading(input: ObserveInput) {
    const hit = evaluateAlarmLimits(input.tag, input.value);
    const active = await this.prisma.alarmEvent.findFirst({
      where: { tagId: input.tag.id, state: 'active' },
      orderBy: { startedAt: 'desc' },
    });

    if (!hit) {
      if (active) {
        await this.prisma.alarmEvent.update({
          where: { id: active.id },
          data: { state: 'returned', clearedAt: input.time },
        });
      }
      return;
    }

    if (active && active.alarmType === hit.alarmType) {
      return;
    }
    if (active) {
      await this.prisma.alarmEvent.update({
        where: { id: active.id },
        data: { state: 'returned', clearedAt: input.time },
      });
    }

    await this.prisma.alarmEvent.create({
      data: {
        tenantId: input.tenantId,
        tagId: input.tag.id,
        equipmentId: input.tag.equipmentId,
        startedAt: input.time,
        priority: hit.priority,
        alarmType: hit.alarmType,
        state: 'active',
        value: input.value,
        message: hit.message,
      },
    });
    this.logger.debug(hit.message);
  }
}
