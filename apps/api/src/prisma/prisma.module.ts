import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { TenantModule } from '../common/tenant/tenant.module';

@Module({
  // TenantModule هم Global است؛ import صریح آن اینجا فقط برای خواناتر کردن
  // وابستگی PrismaService -> TenantContextService است (بدون این import هم
  // کار می‌کرد، چون Global، ولی وضوح گراف وابستگی را بیشتر می‌کند).
  imports: [TenantModule],
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class PrismaModule {}
