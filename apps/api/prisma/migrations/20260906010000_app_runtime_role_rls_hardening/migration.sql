-- سخت‌سازی RLS واقعی PetroOps (لایهٔ دوم دفاعی، مستقل و علاوه‌بر فیلتر
-- tenantId که همیشه در کد سرویس‌ها هم هست — ن‌ه جایگزین آن):
--
-- ۱) رفع باگ ۱۰ پالیسی موجود (migration های init و phase2_telemetry_ai): در بند
--    سوم هر USING، فراخوانی current_setting('app.tenant_id') بدون آرگومان دوم
--    missing_ok=true بود. اگر session هیچ‌وقت app.tenant_id ست نکرده باشد
--    (یعنی GUC اصلاً در آن backend تعریف نشده)، PostgreSQL همان لحظه با خطای
--    «unrecognized configuration parameter "app.tenant_id"» شکست می‌خورد؛ چون
--    ارزیابی عبارات OR در برنامه‌ریز/اجراکنندهٔ Postgres لزوماً left-to-right و
--    کوتاه‌مدار (short-circuit) نیست و current_setting هم STABLE است نه
--    VOLATILE. این باگ با یک اسکریپت پروب موقت (بعد از تأیید حذف شد) روی
--    دیتابیس محلی بازتولید و این فیکس هم به همان روش تأیید شد.
--
-- ۲) افزودن FORCE ROW LEVEL SECURITY: به‌طور پیش‌فرض RLS روی مالک جدول (owner)
--    اعمال نمی‌شود. امروز مالک همان نقش migration/سوپریوزر (POSTGRES_USER) است
--    که BYPASSRLS دارد، پس FORCE برای او هم فرقی نمی‌کند؛ ولی یک محافظ
--    دفاع‌در-عمق برای هر مالکیت/نقش غیر-سوپریوزر آینده است (هزینه‌اش صفر).
--
-- ساخت نقش محدود اجرای برنامه (پیش‌فرض aria_petroops_app) و GRANT های آن در
-- این فایل SQL نیست — چون نیاز به رمزعبور از env دارد که نباید در یک migration
-- نسخه‌کنترل‌شده هاردکد شود. آن کار در «apps/api/prisma/provision-app-role.js»
-- انجام می‌شود که بعد از «prisma migrate deploy» در infra/docker/api-prod.sh
-- صدا زده می‌شود؛ فقط اگر APP_DB_PASSWORD در env ست شده باشد (در غیر این
-- صورت no-op است و رفتار قبلی -بدون سخت‌سازی نقش- حفظ می‌شود، یعنی این
-- migration به‌تنهایی هیچ deploy موجودی را نمی‌شکند).

ALTER POLICY tenant_isolation_users ON "users"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_sites ON "sites"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_work_orders ON "work_orders"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_maintenance_plans ON "maintenance_plans"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_anomaly_events ON "anomaly_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_ai_query_log ON "ai_query_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_audit_log ON "audit_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_alarm_events ON "alarm_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_energy_meters ON "energy_meters"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);
ALTER POLICY tenant_isolation_integration_deliveries ON "integration_deliveries"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sites" FORCE ROW LEVEL SECURITY;
ALTER TABLE "work_orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "anomaly_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ai_query_log" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
ALTER TABLE "alarm_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "energy_meters" FORCE ROW LEVEL SECURITY;
ALTER TABLE "integration_deliveries" FORCE ROW LEVEL SECURITY;
