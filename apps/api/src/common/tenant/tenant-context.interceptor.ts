import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { AuthUser } from '../../modules/auth/auth-user';

/**
 * روی هر درخواست HTTP، tenantId کاربر جاری (که JwtAuthGuard/JwtStrategy قبل
 * از این اینترسپتور روی request.user گذاشته) را داخل TenantContextService
 * (AsyncLocalStorage) قرار می‌دهد. باید GLOBAL باشد (در AppModule با
 * APP_INTERCEPTOR) تا PrismaService بتواند برای *هر* کوئری، بدون تغییر در
 * کدِ سرویس‌های موجود، app.tenant_id را برای RLS ست کند.
 *
 * ترتیب اجرای Nest: Guard ها قبل از Interceptor ها اجرا می‌شوند؛ پس چون
 * JwtAuthGuard در سطح هر Controller با @UseGuards ست شده، وقتی این
 * اینترسپتور (global) اجرا می‌شود request.user از قبل پر است (اگر route
 * محافظت‌شده باشد). برای route های عمومی (health, login) request.user
 * وجود ندارد و tenantId به‌سادگی null می‌ماند.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      // WebSocket Gateway (Socket.IO) و سایر transport ها فعلاً از این
      // context جدا هستند؛ کوئری‌های آن‌ها همچنان فقط با فیلتر tenantId در
      // کد سرویس محافظت می‌شوند (بدون رگرسیون نسبت به وضعیت قبلی).
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const tenantId = request.user?.tenantId ?? null;

    return new Observable((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
