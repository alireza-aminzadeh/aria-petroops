import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

@Module({
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class PrismaModule {}
