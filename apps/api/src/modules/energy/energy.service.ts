import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import { EnergyKind, summarizeEnergy } from './energy-factors';

@Injectable()
export class EnergyService {
  constructor(private readonly prisma: PrismaService) {}

  meters(user: AuthUser) {
    return this.prisma.energyMeter.findMany({
      where: { tenantId: user.tenantId },
      include: { tag: { select: { tagName: true, unitOfMeasure: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async dashboard(user: AuthUser, hours = 24) {
    const meters = await this.meters(user);
    const from = new Date(Date.now() - hours * 3600_000);
    const rows = await Promise.all(
      meters.map(async (meter) => {
        const readings = await this.prisma.energyReading.findMany({
          where: { meterId: meter.id, time: { gte: from } },
          orderBy: { time: 'asc' },
          take: 2000,
        });
        const latest = readings.at(-1)?.value ?? 0;
        const avg =
          readings.length === 0
            ? 0
            : readings.reduce((sum, row) => sum + row.value, 0) / readings.length;
        return {
          meter,
          latest,
          average: avg,
          points: readings,
        };
      }),
    );

    const summary = summarizeEnergy(
      rows.map((row) => ({
        kind: row.meter.kind as EnergyKind,
        quantity: row.average * hours,
        factor: row.meter.emissionFactorKgCo2e,
      })),
    );

    return {
      hours,
      disclaimer:
        'ضریب انتشار پیش‌فرض است و برای ادعای انطباق زیست‌محیطی باید با موجودی GHG سایت جایگزین شود.',
      summary,
      meters: rows.map((row) => ({
        id: row.meter.id,
        code: row.meter.code,
        name: row.meter.name,
        kind: row.meter.kind,
        unitOfMeasure: row.meter.unitOfMeasure,
        latest: row.latest,
        average: row.average,
        co2eKg: row.average * hours * row.meter.emissionFactorKgCo2e,
        tagName: row.meter.tag?.tagName ?? null,
      })),
    };
  }
}
