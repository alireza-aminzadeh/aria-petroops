import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiAnswer, AiGatewayPort, AiRulEstimate } from './ai-gateway.port';
import { retrieveKnowledge } from './knowledge/pack';
import { estimateRemainingUsefulLife } from './ml/rul';

@Injectable()
export class OnPremAiGatewayAdapter implements AiGatewayPort {
  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  method(): string {
    return 'onprem-isolation-forest';
  }

  async explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer> {
    const event = eventId
      ? await this.prisma.anomalyEvent.findFirst({
          where: { id: eventId },
          include: { equipment: true, tag: true },
        })
      : await this.prisma.anomalyEvent.findFirst({
          where: { status: 'open' },
          orderBy: { detectedAt: 'desc' },
          include: { equipment: true, tag: true },
        });

    const query = String(context?.query ?? '');
    const docs = retrieveKnowledge(
      `${query} ${event?.equipment?.tagNumber ?? ''} ارتعاش آنومالی`,
      2,
    );

    if (!event) {
      if (docs.length === 0) {
        return AiAnswer.unavailable('رویداد آنومالی برای توضیح پیدا نشد.');
      }
      return AiAnswer.from(
        docs.map((doc) => `${doc.title}: ${doc.text}`).join('\n\n'),
        docs.map((doc) => doc.citation),
      );
    }

    const contributors = Array.isArray(event.contributors)
      ? (event.contributors as { tagName?: string; zScore?: number }[])
      : [];
    const top = contributors
      .slice(0, 3)
      .map((item) => `${item.tagName ?? '?'} (z=${Number(item.zScore ?? 0).toFixed(2)})`)
      .join('، ');
    const body = [
      event.summary ?? `رویداد ${event.id} با روش ${event.method} ثبت شد.`,
      `امتیاز Isolation Forest: ${event.score?.toFixed(3) ?? '—'} (بالاتر از آستانه ≈ غیرعادی).`,
      top ? `تگ‌های مؤثر: ${top}.` : '',
      ...docs.map((doc) => `${doc.title}: ${doc.text}`),
    ]
      .filter(Boolean)
      .join('\n\n');

    return AiAnswer.from(body, [
      'Isolation Forest (Liu et al., 2008) — on-prem PetroOps',
      ...docs.map((doc) => doc.citation),
    ]);
  }

  async estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id: equipmentId },
      include: { tags: true },
    });
    if (!equipment) {
      return AiRulEstimate.unavailable('تجهیز یافت نشد.');
    }

    const latestByName: Record<string, number> = {};
    for (const tag of equipment.tags) {
      const last = await this.prisma.sensorReading.findFirst({
        where: { tagId: tag.id },
        orderBy: { time: 'desc' },
      });
      if (last) {
        latestByName[tag.tagName] = last.value;
      }
    }

    const vibration = latestByName['P-101.VIBRATION'] ?? latestByName[Object.keys(latestByName).find((name) => name.includes('VIBRATION')) ?? ''];
    const bearing =
      latestByName['P-101.BEARING_TEMP'] ??
      latestByName[Object.keys(latestByName).find((name) => name.includes('BEARING') || name.includes('TEMP')) ?? ''];

    const estimate = estimateRemainingUsefulLife({
      vibrationMmS: vibration,
      bearingTempC: bearing,
      criticality: equipment.criticality,
    });
    return AiRulEstimate.from(estimate.remainingDays, {
      healthIndex: estimate.healthIndex,
      method: estimate.method,
      notes: estimate.notes,
    });
  }

  async askKnowledgeBase(query: string): Promise<AiAnswer> {
    const docs = retrieveKnowledge(query, 3);
    if (docs.length === 0) {
      return AiAnswer.from(
        'در بستهٔ دانش محلی مدرکی با این واژه‌ها پیدا نشد. این جستجو LLM/RAG نیست؛ فقط استانداردهای عمومی بارگذاری‌شده روی همین سرور است.',
        [],
      );
    }
    const text = docs.map((doc) => `## ${doc.title}\n${doc.text}`).join('\n\n');
    return AiAnswer.from(text, docs.map((doc) => doc.citation));
  }
}
