import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { parseCsvReadings } from '../telemetry/csv-parser';
import { upsertOperatorUser } from './upsert-operator-user';

@Injectable()
export class OperatorBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(OperatorBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const tenant =
        (await this.prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        })) ??
        (await this.prisma.tenant.create({
          data: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'پالایشگاه نمونه آریا',
          },
        }));

      await upsertOperatorUser(this.prisma, tenant.id);
      await this.ensureDemoCatalog(tenant.id);
    } catch (error) {
      this.logger.warn(
        `Operator bootstrap skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async ensureDemoCatalog(tenantId: string) {
    const site = await this.prisma.site.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        tenantId,
        name: 'سایت پالایش نمونه',
        location: 'عسلویه',
      },
    });

    const unit = await this.prisma.unit.upsert({
      where: { id: '33333333-3333-3333-3333-333333333333' },
      update: {},
      create: {
        id: '33333333-3333-3333-3333-333333333333',
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

    const tags = [
      { tagName: 'P-101.DISCHARGE_PRESSURE', unitOfMeasure: 'bar' },
      { tagName: 'P-101.BEARING_TEMP', unitOfMeasure: 'degC' },
      { tagName: 'P-101.VIBRATION', unitOfMeasure: 'mm/s' },
    ];

    for (const tag of tags) {
      await this.prisma.tag.upsert({
        where: { tagName: tag.tagName },
        update: {},
        create: {
          equipmentId: pump.id,
          tagName: tag.tagName,
          unitOfMeasure: tag.unitOfMeasure,
          dataType: 'numeric',
        },
      });
    }

    const csvPath = [
      join(process.cwd(), 'fixtures', 'sample-readings.csv'),
      join(__dirname, '..', '..', '..', 'fixtures', 'sample-readings.csv'),
    ].find((path) => existsSync(path));

    if (!csvPath) {
      this.logger.warn('Sample telemetry CSV not found; dashboard seed skipped');
      return;
    }

    const rows = parseCsvReadings(readFileSync(csvPath, 'utf8'));
    for (const row of rows) {
      const tag = await this.prisma.tag.findUnique({
        where: { tagName: row.tag_name },
      });
      if (!tag) continue;
      const time = new Date(row.time);
      await this.prisma.sensorReading.upsert({
        where: { time_tagId: { time, tagId: tag.id } },
        update: { value: row.value, quality: row.quality ?? 0 },
        create: {
          time,
          tagId: tag.id,
          value: row.value,
          quality: row.quality ?? 0,
        },
      });
    }
  }
}
