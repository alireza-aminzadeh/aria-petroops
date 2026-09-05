import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../prisma/audit.service';
import { parseCsvReadings } from './csv-parser';
import { AuthUser } from '../auth/auth-user';
import { TelemetryIngestService } from './telemetry-ingest.service';

@Injectable()
export class CsvImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ingest: TelemetryIngestService,
  ) {}

  async importCsv(user: AuthUser, csvText: string) {
    let rows;
    try {
      rows = parseCsvReadings(csvText);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'CSV نامعتبر است.',
      );
    }

    let imported = 0;
    for (const row of rows) {
      const tag = await this.prisma.tag.findFirst({
        where: {
          tagName: row.tag_name,
          equipment: { unit: { site: { tenantId: user.tenantId } } },
        },
      });
      if (!tag) {
        throw new NotFoundException(`تگ ${row.tag_name} یافت نشد.`);
      }

      const time = new Date(row.time);
      if (Number.isNaN(time.getTime())) {
        throw new BadRequestException(`زمان نامعتبر: ${row.time}`);
      }

      await this.ingest.ingest({
        tagName: row.tag_name,
        time,
        value: row.value,
        quality: row.quality ?? 0,
      });
      imported += 1;
    }

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'sensor_readings',
      entityId: user.tenantId,
      action: 'CSV_IMPORT',
      actorId: user.id,
      payload: { imported },
    });

    return { imported };
  }

  readings(user: AuthUser, tagId: string, from?: string, to?: string) {
    return this.prisma.sensorReading.findMany({
      where: {
        tagId,
        tag: { equipment: { unit: { site: { tenantId: user.tenantId } } } },
        ...(from || to
          ? {
              time: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { time: 'asc' },
      take: 2000,
    });
  }
}
