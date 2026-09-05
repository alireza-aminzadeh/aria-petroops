import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EnergyIngestService } from './energy-ingest.service';
import { EnergyService } from './energy.service';
import { EnergyController } from './energy.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EnergyController],
  providers: [EnergyIngestService, EnergyService],
  exports: [EnergyIngestService],
})
export class EnergyModule {}
