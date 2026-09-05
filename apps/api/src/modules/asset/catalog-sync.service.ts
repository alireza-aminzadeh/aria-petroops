import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CDU_TAGS,
  ENERGY_METER_SPECS,
  PUMP_TAGS,
  DEMO_SITE_ID,
  DEMO_UNIT_ID,
  DemoTagSpec,
} from './demo-catalog';

@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(tenantId: string) {
    const site = await this.prisma.site.upsert({
      where: { id: DEMO_SITE_ID },
      update: {},
      create: {
        id: DEMO_SITE_ID,
        tenantId,
        name: 'سایت پالایش نمونه',
        location: 'عسلویه',
      },
    });

    const unit = await this.prisma.unit.upsert({
      where: { id: DEMO_UNIT_ID },
      update: {},
      create: {
        id: DEMO_UNIT_ID,
        siteId: site.id,
        name: 'واحد تقطیر اتمسفریک',
        processType: 'distillation',
      },
    });

    const pump = await this.prisma.equipment.upsert({
      where: { tagNumber: 'P-101' },
      update: {},
      create: {
        unitId: unit.id,
        tagNumber: 'P-101',
        name: 'پمپ خوراک واحد تقطیر',
        equipmentClass: 'pump',
        criticality: 'high',
      },
    });

    const column = await this.prisma.equipment.upsert({
      where: { tagNumber: 'CDU-101' },
      update: {},
      create: {
        unitId: unit.id,
        tagNumber: 'CDU-101',
        name: 'ستون تقطیر اتمسفریک',
        equipmentClass: 'other',
        criticality: 'critical',
      },
    });

    await this.upsertTags(pump.id, PUMP_TAGS);
    await this.upsertTags(column.id, CDU_TAGS);

    for (const spec of ENERGY_METER_SPECS) {
      const tag = await this.prisma.tag.findUnique({ where: { tagName: spec.tagName } });
      await this.prisma.energyMeter.upsert({
        where: { code: spec.code },
        update: {
          emissionFactorKgCo2e: spec.emissionFactorKgCo2e,
          tagId: tag?.id,
        },
        create: {
          tenantId,
          unitId: unit.id,
          equipmentId: column.id,
          tagId: tag?.id,
          code: spec.code,
          name: spec.name,
          kind: spec.kind,
          unitOfMeasure: spec.unitOfMeasure,
          emissionFactorKgCo2e: spec.emissionFactorKgCo2e,
        },
      });
    }

    this.logger.log('ISA-95 demo catalog synchronized');
    await this.seedRecentWindows([...PUMP_TAGS, ...CDU_TAGS]);
    return { pump, column, unit };
  }

  private async seedRecentWindows(tags: DemoTagSpec[]) {
    const now = Date.now();
    for (const spec of tags) {
      const tag = await this.prisma.tag.findUnique({ where: { tagName: spec.tagName } });
      if (!tag) continue;
      const existing = await this.prisma.sensorReading.count({ where: { tagId: tag.id } });
      if (existing >= 32) continue;
      for (let i = 48; i >= 1; i -= 1) {
        const time = new Date(now - i * 15_000);
        const value = spec.baseline + Math.sin(i / 6) * spec.noise;
        await this.prisma.sensorReading.upsert({
          where: { time_tagId: { time, tagId: tag.id } },
          update: {},
          create: { time, tagId: tag.id, value, quality: 0 },
        });
      }
    }
  }

  private async upsertTags(equipmentId: string, tags: DemoTagSpec[]) {
    for (const tag of tags) {
      await this.prisma.tag.upsert({
        where: { tagName: tag.tagName },
        update: {
          alarmLl: tag.alarmLl ?? null,
          alarmLo: tag.alarmLo ?? null,
          alarmHi: tag.alarmHi ?? null,
          alarmHh: tag.alarmHh ?? null,
        },
        create: {
          equipmentId,
          tagName: tag.tagName,
          unitOfMeasure: tag.unitOfMeasure,
          dataType: 'numeric',
          alarmLl: tag.alarmLl,
          alarmLo: tag.alarmLo,
          alarmHi: tag.alarmHi,
          alarmHh: tag.alarmHh,
        },
      });
    }
  }
}
