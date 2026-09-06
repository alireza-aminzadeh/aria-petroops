-- رفع باگ دوم و مستقل RLS (کشف‌شده با تست end-to-end واقعی روی نقش محدود
-- زیر connection pooling): بعد از این‌که یک تراکنش app.tenant_id را با
-- set_config(..., true) (یعنی SET LOCAL) ست می‌کند و commit می‌شود، اگر
-- تراکنش بعدی روی همان کانکشن pooled (بدون ست‌کردن دوباره) current_setting
-- را بخواند، Postgres دیگر NULL برنمی‌گرداند بلکه رشتهٔ خالی '' برمی‌گرداند
-- (چون این یک GUC سفارشی/placeholder است، نه یک پارامتر واقعی هسته). این با
-- یک تست end-to-end واقعی (Nest + Fastify + نقش محدود) تجربی تأیید شد.
--
-- بند دوم هر پالیسی («= ''») این حالت را درست تشخیص می‌دهد، اما چون Postgres
-- ارزیابی عبارات OR را کوتاه‌مدار (short-circuit) تضمین نمی‌کند، بند سوم
-- («...::uuid») هم ممکن است ارزیابی شود و روی رشتهٔ خالی با خطای
-- «invalid input syntax for type uuid» شکست بخورد. راه‌حل: NULLIF(x, '')
-- قبل از cast، تا رشتهٔ خالی همیشه به NULL تبدیل شود (cast کردن NULL به uuid
-- هرگز خطا نمی‌دهد، فقط NULL برمی‌گرداند) — مستقل از ترتیب ارزیابی OR.

ALTER POLICY tenant_isolation_users ON "users"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_sites ON "sites"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_work_orders ON "work_orders"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_maintenance_plans ON "maintenance_plans"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_anomaly_events ON "anomaly_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_ai_query_log ON "ai_query_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_audit_log ON "audit_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_alarm_events ON "alarm_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_energy_meters ON "energy_meters"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER POLICY tenant_isolation_integration_deliveries ON "integration_deliveries"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
