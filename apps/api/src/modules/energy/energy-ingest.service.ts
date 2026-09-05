import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnergyIngestService {
  constructor(private readonly prisma: PrismaService) {}

  async observeTagReading(tagId: string, time: Date, value: number) {
    const meter = await this.prisma.energyMeter.findFirst({
      where: { tagId },
    });
    if (!meter) {
      return;
    }
    await this.prisma.energyReading.upsert({
      where: { time_meterId: { time, meterId: meter.id } },
      update: { value },
      create: { time, meterId: meter.id, value },
    });
  }
}
