import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { parseCsvReadings } from '../telemetry/csv-parser';
import { upsertOperatorUser } from './upsert-operator-user';
import { CatalogSyncService } from '../asset/catalog-sync.service';

@Injectable()
export class OperatorBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(OperatorBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogSyncService,
  ) {}

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
      await this.catalog.sync(tenant.id);
      await this.seedHistoricCsv();
    } catch (error) {
      this.logger.warn(
        `Operator bootstrap skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async seedHistoricCsv() {
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
