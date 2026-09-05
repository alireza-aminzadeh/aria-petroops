import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { CsvImportService } from './csv-import.service';
import { TelemetryGateway } from './telemetry.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TelemetryController],
  providers: [CsvImportService, TelemetryGateway],
  exports: [TelemetryGateway],
})
export class TelemetryModule {}
