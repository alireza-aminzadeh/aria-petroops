# ۱۰) نقشهٔ راه — Aria PetroOps

## فاز ۰ — پیش‌نیاز زیرساخت
- [x] بررسی و مستندسازی معماری، DB schema، API design، BPMS، امنیت (همین مستندات)
- [x] بررسی SSH read-only سرور `91.107.149.251` (مشخصات واقعی گرفته شد)
- [ ] نصب Docker Engine + Compose plugin روی سرور
- [ ] ساخت کاربر `deploy` غیر-root + فعال‌سازی UFW
- [ ] ساخت ریپوی GitHub + اتصال Secrets برای CI/CD
- [ ] رفع مشکل DNS زیردامنهٔ `petro.aria-ai.ir` (باید A record به `91.107.149.251` اشاره کند)

## فاز ۱ — MVP: هستهٔ BPMS
- [x] اسکلت‌سازی مونوریپو Turborepo + pnpm (`apps/api` با NestJS 11، `apps/frontend` با React+Vite)
- [x] Prisma schema + Migration های `sites`, `units`, `equipment`, `tags`, `sensor_readings` (hypertable)، `work_orders`, `maintenance_plans`, `audit_log`, `anomaly_events`, `ai_query_log`
- [x] پیاده‌سازی XState machine کامل برای `work_order` + Service لایهٔ Persist
- [x] CRUD کامل REST API + WebSocket Gateway با JWT در handshake (broadcast دادهٔ CSV، بدون منبع زندهٔ صنعتی)
- [x] ایمپورت CSV برای `sensor_readings` + فایل نمونه + بذر داده
- [x] JWT Auth + RBAC + CASL پایه
- [x] فرانت‌اند: فهرست/ایجاد تجهیزات (ISA-95)، فرم Work Order با مسیر ممیزی، داشبورد ECharts + استریم WebSocket
- [x] AI Gateway Placeholder (Port + Stub + جدول‌های DB) — **بدون هیچ inference واقعی**
- [ ] استقرار اولیهٔ Production روی `91.107.149.251` + فعال‌سازی CI/CD روی ریپوی GitHub (کد پایپ‌لاین آماده است؛ سرور/DNS/Secrets هنوز انجام نشده)

## فاز ۲ — تله‌متری واقعی و اتصال AI
- [ ] اتصال واقعی MQTT (`mqtt.js` + EMQX) و/یا OPC-UA (`node-opcua`) — **فقط outbound از Edge Agent در DMZ سایت مشتری**، هرگز نوشتن مستقیم به DCS/PLC
- [ ] فعال‌سازی واقعی AI Gateway مرکزی (مشترک با SafeOps): مدل آنومالی (LSTM-AE/Isolation Forest) و RUL
- [ ] ماژول انرژی/انتشارات (تراز انرژی، فلرینگ، کربن)
- [ ] تحلیل آلارم پیشرفته (ISA-18.2 flood/chattering)
- [ ] اتصال بین‌سامانه‌ای واقعی به SafeOps (equipment_tag مشترک)

## فاز ۳ — بلوغ
- [ ] بهینه‌سازی تولید/Blending (OR-Tools/CVXPY از طریق AI Gateway)
- [ ] پایش خطوط لوله (midstream) — تشخیص نشت
- [ ] Digital Twin واحد فرآیندی
- [ ] Temporal برای گردش‌کار TAR چندهفته‌ای (جای‌گزین XState فقط برای این مورد خاص)

## معیار موفقیت فاز ۱ (Definition of Done)
- [x] یک Work Order می‌تواند از `draft` تا `closed` بدون خطا و با Audit Trail کامل عبور کند.
- [x] CSV نمونه با موفقیت import و در WebSocket به فرانت broadcast می‌شود (حتی اگر منبع واقعی صنعتی نباشد).
- [x] تست‌های Jest برای ماشین حالت، persist snapshot، CASL و hash-chain ممیزی.
- [x] پنل‌های AI Gateway در UI دیده می‌شوند ولی صادقانه «به‌زودی» نشان می‌دهند، بدون کرش.
- [ ] پایپ‌لاین CI/CD تا Deploy روی `91.107.149.251` — وابسته به GitHub remote، Secrets و آماده‌سازی سرور (خارج از کد).
