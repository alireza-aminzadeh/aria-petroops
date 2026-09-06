import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CaslModule } from './common/casl/casl.module';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantContextInterceptor } from './common/tenant/tenant-context.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AssetModule } from './modules/asset/asset.module';
import { WorkOrderModule } from './modules/work-order/work-order.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AlarmModule } from './modules/alarm/alarm.module';
import { EnergyModule } from './modules/energy/energy.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { HealthController } from './health.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '../../.env.local', '../../.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    TenantModule,
    PrismaModule,
    CaslModule,
    AuthModule,
    AssetModule,
    WorkOrderModule,
    MaintenanceModule,
    TelemetryModule,
    AlarmModule,
    EnergyModule,
    IntegrationModule,
    AiGatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global: tenantId کاربر جاری را برای طول عمر هر درخواست HTTP در
    // TenantContextService (AsyncLocalStorage) می‌گذارد تا PrismaService
    // بتواند app.tenant_id را برای RLS پایگاه‌داده ست کند (سخت‌سازی لایهٔ دوم).
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
