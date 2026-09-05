import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { CsvImportService } from './csv-import.service';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryIngestService } from './telemetry-ingest.service';
import { MqttIngestService } from './mqtt-ingest.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AlarmModule } from '../alarm/alarm.module';
import { EnergyModule } from '../energy/energy.module';

@Module({
  imports: [PrismaModule, AuthModule, AlarmModule, EnergyModule],
  controllers: [TelemetryController],
  providers: [CsvImportService, TelemetryGateway, TelemetryIngestService, MqttIngestService],
  exports: [TelemetryGateway, TelemetryIngestService, MqttIngestService],
})
export class TelemetryModule {}
