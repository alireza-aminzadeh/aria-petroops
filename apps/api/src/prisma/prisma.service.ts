import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/tenant/tenant-context.service';

/** یک عملیات Prisma روی مدل، به‌صورت دسترسی دینامیک با نام delegate/operation. */
type ModelDelegateMap = Record<
  string,
  Record<string, (args: unknown) => Promise<unknown>>
>;

/** «WorkOrder» -> «workOrder» (نام PascalCase مدل Prisma به نام camelCase پراپرتی delegate روی کلاینت). */
function toDelegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * سخت‌سازی RLS — لایهٔ دوم دفاعی: قبل از هر کوئری روی یک مدل، در همان
 * تراکنش/کانکشنی که کوئری واقعی اجرا می‌شود، app.tenant_id را (اگر
 * TenantContextService مقداری داشته باشد) با set_config ست می‌کند تا
 * پالیسی‌های RLS پایگاه‌داده (migration های init/phase2/app_runtime_role)
 * واقعاً روی این نقش اجرا شوند. این کاملاً مستقل و علاوه‌بر فیلتر tenantId
 * موجود در همهٔ سرویس‌ها (لایهٔ اول) است — جایگزین آن نیست.
 *
 * چرا یک PrismaClient «خام» جدا (rawTx) به‌جای this.$transaction؟ چون this
 * از همین extension استفاده می‌کند؛ اگر تراکنش را با this.$transaction باز
 * کنیم، کلاینت تراکنشی (tx) هم extended می‌ماند و هر کوئری داخل آن دوباره
 * وارد همین extension می‌شود => بازگشت بی‌پایان (recursion). با یک
 * PrismaClient کاملاً جدا و بدون extension برای rawTx، این مسیر هرگز دوباره
 * وارد query() نمی‌شود. این الگو با یک اسکریپت پروب موقت (قبل از این تغییر،
 * حذف‌شده بعد از تأیید) روی دیتابیس محلی اعتبارسنجی شد؛ هزینه‌اش یک connection
 * pool دومِ کوچک است (قابل تنظیم با connection_limit در APP_DATABASE_URL).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** کلاینت خام (بدون extension) فقط برای بازکردن تراکنش set_config + کوئری واقعی. */
  private readonly rawTx: PrismaClient;

  constructor(private readonly tenantContext: TenantContextService) {
    super({ datasourceUrl: PrismaService.resolveDatasourceUrl() });
    this.rawTx = new PrismaClient({
      datasourceUrl: PrismaService.resolveDatasourceUrl(),
    });
    this.applyTenantScoping();
  }

  async onModuleInit() {
    await this.$connect();
    await this.rawTx.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.rawTx.$disconnect();
  }

  /**
   * APP_DATABASE_URL (نقش محدود بدون BYPASSRLS که provision-app-role.js
   * می‌سازد) در صورت وجود اولویت دارد؛ در غیر این صورت به DATABASE_URL —
   * همان که schema.prisma هم استفاده می‌کند — برمی‌گردیم (رفتار قبلی، بدون
   * رگرسیون برای کسی که این قابلیت اختیاری را فعال نکرده).
   */
  private static resolveDatasourceUrl(): string | undefined {
    return process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  }

  private applyTenantScoping(): void {
    const extended = this.$extends({
      name: 'tenant-rls-scoping',
      query: {
        $allOperations: async ({ model, operation, args, query }) => {
          if (!model) {
            // عملیات بدون مدل (مثلاً $queryRaw/$executeRaw مستقیم) از این
            // مسیر رد نمی‌شوند؛ کد فراخوان مسئول فیلتر مناسب است.
            return query(args);
          }

          const tenantId = this.tenantContext.getTenantId();
          const delegateName = toDelegateName(model);

          return this.rawTx.$transaction(async (tx) => {
            if (tenantId) {
              // تگ‌قالب $executeRaw مقدار tenantId را پارامتریزه می‌کند (نه
              // concatenation ساده)؛ در برابر SQL injection ایمن است.
              await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
            }
            const delegates = tx as unknown as ModelDelegateMap;
            return delegates[delegateName][operation](args);
          });
        },
      },
    });

    // فقط delegate های مدل (user، workOrder، ...) را از نسخهٔ extended روی
    // this کپی می‌کنیم. لیست نام مدل‌ها را از Prisma.ModelName (متادیتای
    // تولیدشده توسط prisma generate) می‌گیریم، نه از Object.keys(this) —
    // چون this فیلدهای خودمان (rawTx، tenantContext) را هم به‌عنوان own
    // property دارد و کپی‌کردن آن‌ها از extended (که چنین کلیدهایی ندارد)
    // مقدارشان را با undefined پاک می‌کرد. $transaction/$connect/$disconnect
    // دست‌نخورده (نسخهٔ پایه) می‌مانند تا هیچ recursion ای رخ ندهد.
    const extendedRecord = extended as unknown as Record<string, unknown>;
    const self = this as unknown as Record<string, unknown>;
    for (const modelName of Object.values(Prisma.ModelName)) {
      const delegateName = toDelegateName(modelName);
      self[delegateName] = extendedRecord[delegateName];
    }
  }
}
