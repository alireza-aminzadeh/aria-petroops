-- افزودن فیلدهای موتور زمان‌بندی heuristic (نت/TAR) به maintenance_plans.
-- توجه: Prisma migrate dev هنگام diff همچنین سه DROP INDEX پیشنهاد داده بود
-- (anomaly_events_tenant_id_idx، energy_readings_time_idx،
-- sensor_readings_time_idx). دوتای آخر ایندکس داخلی TimescaleDB روی ستون
-- زمان hypertable هستند (توسط create_hypertable ساخته می‌شوند، نه توسط این
-- schema)؛ Prisma چون از وجودشان در schema.prisma خبر ندارد، آن‌ها را «drift»
-- تشخیص می‌دهد. حذفشان می‌توانست chunk exclusion و کارایی کوئری‌های
-- سری‌زمانی را به‌شدت بد کند، پس عمداً از این migration حذف شدند — این
-- migration فقط تغییرات واقعاً مرتبط با scheduler را اعمال می‌کند.

ALTER TABLE "maintenance_plans" ADD COLUMN     "assigned_to_id" UUID,
ADD COLUMN     "estimated_hours" DOUBLE PRECISION,
ADD COLUMN     "scheduled_end" TIMESTAMPTZ(6),
ADD COLUMN     "scheduled_start" TIMESTAMPTZ(6);

CREATE INDEX "maintenance_plans_tenant_id_scheduled_start_idx" ON "maintenance_plans"("tenant_id", "scheduled_start");

ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
