import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AlarmService } from './alarm.service';
import { AlarmQueryService } from './alarm-query.service';
import { AlarmController } from './alarm.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AlarmController],
  providers: [AlarmService, AlarmQueryService],
  exports: [AlarmService],
})
export class AlarmModule {}
