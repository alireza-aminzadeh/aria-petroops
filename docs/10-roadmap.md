# ۱۰) نقشهٔ راه — Aria PetroOps

## فاز ۰ — پیش‌نیاز زیرساخت
- [x] بررسی و مستندسازی معماری، DB schema، API design، BPMS، امنیت (همین مستندات)
- [x] بررسی SSH read-only سرور `91.107.149.251` (مشخصات واقعی گرفته شد)
- [x] نصب Docker Engine + Compose plugin روی سرور
- [x] ساخت کاربر `deploy` غیر-root + فعال‌سازی UFW
- [x] ساخت ریپوی GitHub + اتصال Secrets برای CI/CD
- [x] DNS زیردامنهٔ `petro.aria-ai.ir` به `91.107.149.251` + گواهی Let's Encrypt

## فاز ۱ — MVP: هستهٔ BPMS
- [x] اسکلت‌سازی مونوریپو Turborepo + pnpm (`apps/api` با NestJS 11، `apps/frontend` با React+Vite)
- [x] Prisma schema + Migration های `sites`, `units`, `equipment`, `tags`, `sensor_readings` (hypertable)، `work_orders`, `maintenance_plans`, `audit_log`, `anomaly_events`, `ai_query_log`
- [x] پیاده‌سازی XState machine کامل برای `work_order` + Service لایهٔ Persist
- [x] CRUD کامل REST API + WebSocket Gateway با JWT در handshake (broadcast دادهٔ CSV، بدون منبع زندهٔ صنعتی)
- [x] ایمپورت CSV برای `sensor_readings` + فایل نمونه + بذر داده
- [x] JWT Auth + RBAC + CASL پایه
- [x] فرانت‌اند: فهرست/ایجاد تجهیزات (ISA-95)، فرم Work Order با مسیر ممیزی، داشبورد ECharts + استریم WebSocket
- [x] فعال‌سازی واقعی `date-fns-jalali` (قبلاً در package.json بود ولی هیچ‌جا import نمی‌شد؛ تاریخ‌ها فقط با `toLocaleString('fa-IR')` خام نشان داده می‌شدند و بیشتر جاها -آلارم/نت/آنومالی- اصلاً تاریخ نشان نمی‌دادند). حالا `apps/frontend/src/lib/date.ts` + `lib/locale.tsx` یک سوییچ «نمایش تاریخ/عدد: شمسی ↔ میلادی» (نه ترجمهٔ کامل UI؛ متن‌ها فارسی می‌مانند) در نوار کناری دارند و در مسیر ممیزی Work Order، آلارم‌ها، سررسید نت، و رویدادهای آنومالی استفاده می‌شوند
- [x] AI Gateway Placeholder (Port + Stub + جدول‌های DB) — **بدون هیچ inference واقعی**
- [x] استقرار اولیهٔ Production روی `91.107.149.251` + فعال‌سازی CI/CD روی ریپوی GitHub

## فاز ۲ — تله‌متری واقعی و اتصال AI
- [x] اتصال MQTT (`mqtt.js` + Mosquitto ۲.۰ روی سرور کم‌حافظه؛ مسیر مقیاس EMQX در docs/08) — Edge Agent فقط outbound، بدون نوشتن به DCS/PLC
- [x] OPC-UA فقط‌خواندنی در Edge Agent وقتی `OPCUA_ENDPOINT_URL` ست شود — `node-opcua-client` حالا dependency واقعی و نصب‌شده در `infra/edge-agent/package.json` است (نه فقط کد آمادهٔ import پویا)؛ اتصال با سقف زمانی ۲۰ ثانیه‌ای و fallback امن به شبیه‌ساز اگر سرور در دسترس نباشد
- [x] موتور AI on-prem: Isolation Forest + RUL مهندسی (ISO 10816) + بستهٔ دانش محلی؛ `HttpAiGatewayAdapter` برای LSTM-AE مرکزی
- [x] broadcast رویدادهای آنومالی (باز/به‌روزرسانی/acknowledge/بسته‌شدن) روی همان WebSocket Gateway تگ‌ها (`anomaly:update`) — قبلاً فقط REST بود، صفحهٔ AI حالا بدون رفرش دستی زنده به‌روز می‌شود. به همین بهانه، broadcast های Gateway (هم تگ و هم آنومالی) به یک Socket.IO room بر اساس تننت محدود شدند (قبلاً global `server.emit` بود که بین تننت‌ها نشتی داده داشت)
- [x] ماژول انرژی/انتشارات (تراز، فلر، کربن با ضریب پیش‌فرض قابل‌کالیبراسیون)
- [x] تحلیل آلارم ISA-18.2 (flood / chattering / standing)
- [x] اتصال بین‌سامانه‌ای به SafeOps از طریق `equipment_tag` (outbox + گیرندهٔ API)
- [x] سخت‌سازی چندمستأجری (لایهٔ دوم دفاعی، علاوه‌بر فیلتر `tenantId` که همیشه در کد بود): فعال‌سازی واقعی RLS پایگاه‌داده در runtime — `app.tenant_id` حالا واقعاً روی هر کوئری Prisma ست می‌شود (`TenantContextInterceptor` + `PrismaService` Client Extension) و برنامه با یک نقش Postgres محدود بدون `BYPASSRLS` وصل می‌شود (`provision-app-role.js`، اختیاری/opt-in با `APP_DB_PASSWORD`). جزئیات: [`07-security.md#۷۹`](07-security.md#۷۹-سخت‌سازی-چندمستأجری-rls-در-سطح-پایگاهداده).

## فاز ۳ — بلوغ
- [ ] بهینه‌سازی تولید/Blending (OR-Tools/CVXPY از طریق AI Gateway) — **متفاوت** از heuristic scheduler نت/TAR که پایین اضافه شد؛ این مورد بهینه‌سازی ریاضی محدودیت‌های تولید/آشیخته‌سازی است، نه زمان‌بندی نیروی انسانی
- [ ] پایش خطوط لوله (midstream) — تشخیص نشت
- [ ] Digital Twin واحد فرآیندی
- [ ] Temporal برای گردش‌کار TAR چندهفته‌ای (جای‌گزین XState فقط برای این مورد خاص)
- [x] موتور heuristic زمان‌بندی نت/TAR (نه یک solver بهینهٔ ریاضی؛ list-scheduling حریصانه با موازنهٔ بار): `apps/api/src/modules/maintenance/scheduler.ts` — کارهای «تأییدشده» با ساعت برآوردی (`estimatedHours`، فیلد جدید) را طبق فوریت (معوق > criticality > نزدیک‌ترین سررسید) بین تکنسین‌ها (نقش `TECHNICIAN`) توزیع می‌کند و ظرفیت روزانه/عدم هم‌پوشانی را رعایت می‌کند. اندپوینت: `POST /maintenance-plans/schedule`؛ دکمهٔ «زمان‌بندی خودکار» در `MaintenancePage`. قبلاً `maintenance_plans` فقط CRUD خام بود (بدون تخصیص تکنسین/زمان). تست‌ها: `scheduler.spec.ts` (الگوریتم خالص) + `maintenance.service.spec.ts` (یکپارچگی با Prisma mock‌شده).

## معیار موفقیت فاز ۲
- [x] تگ صنعتی از MQTT به `sensor_readings` می‌رسد و روی WebSocket پخش می‌شود (بدون نوشتن به OT).
- [x] Isolation Forest رویداد `open` می‌سازد؛ توضیح و RUL در UI عدد واقعی می‌دهند نه «به‌زودی».
- [x] KPI آلارم ISA-18.2 و داشبورد انرژی/کربن داده برمی‌گردانند.
- [x] Outbox SafeOps برای `equipment_tag` ثبت می‌شود (تحویل وقتی `SAFEOPS_ENABLED=true`).

## معیار موفقیت فاز ۱ (Definition of Done)
- [x] یک Work Order می‌تواند از `draft` تا `closed` بدون خطا و با Audit Trail کامل عبور کند.
- [x] CSV نمونه با موفقیت import و در WebSocket به فرانت broadcast می‌شود (حتی اگر منبع واقعی صنعتی نباشد).
- [x] تست‌های Jest برای ماشین حالت، persist snapshot، CASL و hash-chain ممیزی.
- [x] پنل‌های AI Gateway در UI دیده می‌شوند ولی صادقانه «به‌زودی» نشان می‌دهند، بدون کرش.
- [x] پایپ‌لاین CI/CD تا Deploy روی `91.107.149.251`
