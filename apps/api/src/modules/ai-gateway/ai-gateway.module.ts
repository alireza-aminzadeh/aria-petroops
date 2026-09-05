import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiGatewayController } from './ai-gateway.controller';
import { StubAiGatewayAdapter } from './stub-ai-gateway.adapter';
import { OnPremAiGatewayAdapter } from './onprem-ai-gateway.adapter';
import { HttpAiGatewayAdapter } from './http-ai-gateway.adapter';
import { AiGatewayPort } from './ai-gateway.port';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WorkOrderModule } from '../work-order/work-order.module';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service';
import { IntegrationModule } from '../integration/integration.module';

export const AI_GATEWAY = 'AiGatewayPort';

@Module({
  imports: [PrismaModule, AuthModule, WorkOrderModule, IntegrationModule],
  controllers: [AiGatewayController],
  providers: [
    StubAiGatewayAdapter,
    OnPremAiGatewayAdapter,
    HttpAiGatewayAdapter,
    AnomalyDetectionService,
    {
      provide: AI_GATEWAY,
      inject: [ConfigService, StubAiGatewayAdapter, OnPremAiGatewayAdapter, HttpAiGatewayAdapter],
      useFactory: (
        config: ConfigService,
        stub: StubAiGatewayAdapter,
        onPrem: OnPremAiGatewayAdapter,
        http: HttpAiGatewayAdapter,
      ): AiGatewayPort => {
        if (config.get('AI_GATEWAY_ENABLED') === 'false') {
          return stub;
        }
        if (config.get('AI_GATEWAY_URL')) {
          return http;
        }
        return onPrem;
      },
    },
  ],
  exports: [AI_GATEWAY],
})
export class AiGatewayModule {}
