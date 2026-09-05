import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAnswer, AiGatewayPort, AiRulEstimate } from './ai-gateway.port';

@Injectable()
export class HttpAiGatewayAdapter implements AiGatewayPort {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get('AI_GATEWAY_URL'));
  }

  method(): string {
    return 'http-central';
  }

  async explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer> {
    return this.post('/v1/anomaly/explain', { eventId, ...context });
  }

  async estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate> {
    const data = await this.get(`/v1/rul?equipmentId=${encodeURIComponent(equipmentId)}`);
    if (!data || data.available === false) {
      return AiRulEstimate.unavailable(String(data?.unavailableReason ?? 'AI Gateway مرکزی پاسخ نداد.'));
    }
    return AiRulEstimate.from(Number(data.remainingDays), {
      healthIndex: data.healthIndex,
      method: data.method,
      notes: data.notes,
    });
  }

  async askKnowledgeBase(query: string, context?: Record<string, unknown>): Promise<AiAnswer> {
    return this.post('/v1/knowledge', { query, ...context });
  }

  private base() {
    return (this.config.get<string>('AI_GATEWAY_URL') ?? '').replace(/\/$/, '');
  }

  private headers() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = this.config.get<string>('AI_GATEWAY_API_KEY');
    if (key) headers.Authorization = `Bearer ${key}`;
    return headers;
  }

  private timeout() {
    return Number(this.config.get('AI_GATEWAY_TIMEOUT_MS') ?? 8000);
  }

  private async post(path: string, body: unknown): Promise<AiAnswer> {
    try {
      const response = await fetch(`${this.base()}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout()),
      });
      const data = (await response.json()) as {
        text?: string;
        citations?: string[];
        unavailableReason?: string;
        available?: boolean;
      };
      if (!response.ok || data.available === false) {
        return AiAnswer.unavailable(data.unavailableReason ?? `HTTP ${response.status}`);
      }
      return AiAnswer.from(data.text ?? '', data.citations ?? []);
    } catch (error) {
      return AiAnswer.unavailable(
        error instanceof Error ? error.message : 'AI Gateway مرکزی در دسترس نیست.',
      );
    }
  }

  private async get(path: string): Promise<{
    available?: boolean;
    remainingDays?: number;
    healthIndex?: number;
    method?: string;
    notes?: string[];
    unavailableReason?: string;
  }> {
    try {
      const response = await fetch(`${this.base()}${path}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.timeout()),
      });
      return (await response.json()) as {
        available?: boolean;
        remainingDays?: number;
        healthIndex?: number;
        method?: string;
        notes?: string[];
        unavailableReason?: string;
      };
    } catch (error) {
      return {
        available: false,
        unavailableReason: error instanceof Error ? error.message : 'AI Gateway مرکزی در دسترس نیست.',
      };
    }
  }
}
