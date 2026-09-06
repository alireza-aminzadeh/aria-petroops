// apps/api/prisma/provision-app-role.js
//
// سخت‌سازی RLS — لایهٔ دوم دفاعی (مستقل از فیلتر tenantId که همیشه در کد هم
// هست): این اسکریپت یک نقش Postgres محدود (بدون SUPERUSER و بدون BYPASSRLS)
// می‌سازد/به‌روزرسانی می‌کند که برنامه (نه migration) با آن به دیتابیس وصل
// می‌شود، تا پالیسی‌های RLS واقعاً روی کوئری‌های runtime اعمال شوند.
//
// چرا اینجا و نه در یک migration.sql؟ چون رمزعبور این نقش باید از env بیاید
// و هرگز نباید در یک فایل SQL نسخه‌کنترل‌شده هاردکد شود. این اسکریپت با همان
// نقش migration/سوپریوزر (DATABASE_URL) وصل می‌شود که خودش قبلاً «prisma
// migrate deploy» را اجرا کرده، پس صلاحیت CREATE ROLE/GRANT را دارد.
//
// ایدمپوتنت و امن برای اجرای مکرر (هر deploy): اگر APP_DB_PASSWORD ست نشده
// باشد، به‌صورت no-op و بدون خطا خارج می‌شود — یعنی رفتار قبلی (بدون
// سخت‌سازی نقش، دقیقاً مثل امروز) برای کسانی که این قابلیت اختیاری را فعال
// نکرده‌اند حفظ می‌ماند و هیچ deploy موجودی نمی‌شکند.
//
// اجرا: node apps/api/prisma/provision-app-role.js
// (از infra/docker/api-prod.sh بعد از «prisma migrate deploy» صدا زده می‌شود.)
'use strict';

const { PrismaClient } = require('@prisma/client');

/** شناسه‌های SQL (نام نقش/دیتابیس) را برای درج امن داخل DDL کوته می‌کند. */
function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const roleName = process.env.APP_DB_ROLE || 'aria_petroops_app';
  const password = process.env.APP_DB_PASSWORD || '';

  if (!password) {
    console.log(
      '[provision-app-role] APP_DB_PASSWORD تنظیم نشده — از سخت‌سازی نقش ' +
        'محدود صرف‌نظر می‌شود (برنامه با همان نقش migration/سوپریوزر به ' +
        'دیتابیس وصل می‌ماند و RLS در سطح دیتابیس عملاً غیرفعال باقی ' +
        '(bypass) خواهد بود؛ فیلتر tenantId در کد سرویس‌ها همچنان فعال است). ' +
        'برای فعال‌سازی، APP_DB_ROLE + APP_DB_PASSWORD + APP_DATABASE_URL را ' +
        'در .env پر کنید.',
    );
    return;
  }

  if (!/^[a-z_][a-z0-9_]*$/i.test(roleName)) {
    throw new Error(
      `[provision-app-role] نام نقش نامعتبر است: "${roleName}" — فقط حروف/عدد/آندرلاین مجاز است.`,
    );
  }

  const prisma = new PrismaClient(); // با DATABASE_URL (نقش migration/سوپریوزر) وصل می‌شود
  await prisma.$connect();

  try {
    const roleIdent = quoteIdentifier(roleName);
    const passwordLiteral = quoteLiteral(password);

    const [{ current_database: dbName }] = await prisma.$queryRawUnsafe(
      'SELECT current_database()',
    );
    const dbIdent = quoteIdentifier(dbName);

    const [{ exists: roleExists }] = await prisma.$queryRawUnsafe(
      'SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists',
      roleName,
    );

    if (!roleExists) {
      await prisma.$executeRawUnsafe(
        `CREATE ROLE ${roleIdent} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${passwordLiteral}`,
      );
      console.log(`[provision-app-role] نقش ${roleName} ساخته شد.`);
    } else {
      // رمز را در هر deploy همگام نگه می‌داریم تا چرخش (rotation) APP_DB_PASSWORD کار کند؛
      // NOSUPERUSER/NOBYPASSRLS را هم دوباره اعمال می‌کنیم تا اگر دستی تغییر کرده بود برگردد.
      await prisma.$executeRawUnsafe(
        `ALTER ROLE ${roleIdent} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${passwordLiteral}`,
      );
      console.log(`[provision-app-role] نقش ${roleName} از قبل موجود بود — رمز/ویژگی‌ها همگام شد.`);
    }

    await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE ${dbIdent} TO ${roleIdent}`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${roleIdent}`);
    await prisma.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleIdent}`,
    );
    await prisma.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleIdent}`,
    );
    // تا جدول‌های migration های بعدی هم بدون نیاز به ویرایش این اسکریپت،
    // خودکار به نقش محدود grant شوند (scope پیش‌فرض ALTER DEFAULT PRIVILEGES
    // بدون FOR ROLE، همان current_user یعنی نقش migration جاری است).
    await prisma.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleIdent}`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleIdent}`,
    );

    console.log(
      `[provision-app-role] grants روی دیتابیس "${dbName}" برای نقش ${roleName} اعمال/همگام شد ` +
        '(بدون BYPASSRLS — پالیسی‌های RLS برای این نقش واقعاً اجرا می‌شوند).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[provision-app-role] خطا در سخت‌سازی نقش دیتابیس:', error);
  process.exitCode = 1;
});
