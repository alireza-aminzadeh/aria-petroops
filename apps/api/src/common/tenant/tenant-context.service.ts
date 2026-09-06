import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContextStore {
  tenantId: string | null;
}

/**
 * نگه‌دارندهٔ tenantId جاری برای طول عمر یک درخواست HTTP، با استفاده از
 * AsyncLocalStorage (بخشی از Node.js core، بدون وابستگی جدید). این سرویس تنها
 * منبعِ حقیقتِ «تننت جاری» برای PrismaService است تا هر کوئری Prisma بتواند
 * app.tenant_id را در Postgres ست کند و پالیسی‌های RLS واقعاً اجرا شوند.
 *
 * توجه: این جایگزین فیلتر tenantId موجود در سرویس‌ها (لایهٔ اول دفاعی) نیست؛
 * فقط لایهٔ دوم (سطح دیتابیس) را اضافه می‌کند. اگر به هر دلیل context خالی
 * باشد (مثلاً یک job پس‌زمینه یا درخواست بدون احراز هویت)، getTenantId()
 * مقدار null برمی‌گرداند و PrismaService به‌سادگی set_config را صدا نمی‌زند —
 * یعنی فقط لایهٔ اول (فیلتر در کد) فعال می‌ماند، نه اینکه کل کوئری خطا بدهد.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextStore>();

  /** درخواست جاری را با tenantId مشخص اجرا می‌کند؛ همهٔ کدهای async فراخوانی‌شده از داخل callback، همین مقدار را می‌بینند. */
  run<T>(tenantId: string | null, callback: () => T): T {
    return this.storage.run({ tenantId }, callback);
  }

  /** tenantId کاربر جاری، یا null اگر خارج از یک درخواست احراز‌هویت‌شده هستیم (مثلاً job/CLI/health-check). */
  getTenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }
}
