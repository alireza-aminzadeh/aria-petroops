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
  ) {}

  static unavailable(): AiRulEstimate {
    return new AiRulEstimate(
      false,
      null,
      'سرویس تخمین عمر باقی‌مانده هنوز فعال نشده است.',
    );
  }
}

export interface AiGatewayPort {
  isEnabled(): boolean;
  explainAnomaly(eventId: string, context?: Record<string, unknown>): Promise<AiAnswer>;
  estimateRemainingUsefulLife(equipmentId: string): Promise<AiRulEstimate>;
  askKnowledgeBase(query: string, context?: Record<string, unknown>): Promise<AiAnswer>;
}
