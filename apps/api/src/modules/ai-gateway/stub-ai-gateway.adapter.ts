import { Injectable } from '@nestjs/common';
import {
  AiAnswer,
  AiGatewayPort,
  AiRulEstimate,
} from './ai-gateway.port';

@Injectable()
export class StubAiGatewayAdapter implements AiGatewayPort {
  isEnabled(): boolean {
    return false;
  }

  async explainAnomaly(): Promise<AiAnswer> {
    return AiAnswer.unavailable(
      'سرویس تحلیل هوشمند آنومالی هنوز فعال نشده است.',
    );
  }

  async estimateRemainingUsefulLife(): Promise<AiRulEstimate> {
    return AiRulEstimate.unavailable();
  }

  async askKnowledgeBase(): Promise<AiAnswer> {
    return AiAnswer.unavailable('سرویس دستیار دانش هنوز فعال نشده است.');
  }
}
