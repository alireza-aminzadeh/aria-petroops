import { Module } from '@nestjs/common';
import { AiGatewayController } from './ai-gateway.controller';
import { StubAiGatewayAdapter } from './stub-ai-gateway.adapter';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AiGatewayController],
  providers: [
    { provide: 'AiGatewayPort', useClass: StubAiGatewayAdapter },
  ],
  exports: ['AiGatewayPort'],
})
export class AiGatewayModule {}
