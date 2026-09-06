import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

/**
 * Global تا PrismaService (در PrismaModule) و هر ماژول دیگری بتوانند
 * TenantContextService را بدون import صریح این ماژول در همه‌جا تزریق کنند.
 * ثبت TenantContextInterceptor به‌عنوان APP_INTERCEPTOR در AppModule انجام
 * می‌شود (کنار ThrottlerGuard) تا محل واحدی برای providerهای global وجود
 * داشته باشد.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule {}
