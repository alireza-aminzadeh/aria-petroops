export class AiAnswer {
  private constructor(
    public readonly available: boolean,
    public readonly text: string | null,
    public readonly citations: string[],
    public readonly unavailableReason: string | null,
  ) {}

  static unavailable(reason: string): AiAnswer {
    return new AiAnswer(false, null, [], reason);
  }

  static from(text: string, citations: string[]): AiAnswer {
    return new AiAnswer(true, text, citations, null);
  }
}

export class AiRulEstimate {
  private constructor(
    public readonly available: boolean,
    public readonly remainingDays: number | null,
    public readonly unavailableReason: string | null,
    public readonly healthIndex: number | null = null,
    public readonly method: string | null = null,
    public readonly notes: string[] = [],
  ) {}

  static unavailable(reason?: string): AiRulEstimate {
    return new AiRulEstimate(
      false,
      null,
      reason ?? 'سرویس تخمین عمر باقی‌مانده هنوز فعال نشده است.',
    );
  }

  static from(remainingDays: number, extra?: { healthIndex?: number; method?: string; notes?: string[] }) {
    return new AiRulEstimate(
      true,
      remainingDays,
      null,
      extra?.healthIndex ?? null,
      extra?.method ?? null,
      extra?.notes ?? [],
    );
  }
}

export interface AiGatewayPort {
  isEnabled(): boolean;
  method(): string;
  explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer>;
  estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate>;
  askKnowledgeBase(query: string, context?: Record<string, unknown>): Promise<AiAnswer>;
}
