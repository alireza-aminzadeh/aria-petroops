import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SafeopsIntegrationService } from './safeops-integration.service';

@Module({
  imports: [PrismaModule],
  providers: [SafeopsIntegrationService],
  exports: [SafeopsIntegrationService],
})
export class IntegrationModule {}
