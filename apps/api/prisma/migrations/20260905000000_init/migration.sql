-- CreateExtension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT '[]',
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "process_type" TEXT NOT NULL,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "tag_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipment_class" TEXT NOT NULL,
    "criticality" TEXT NOT NULL,
    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "tag_name" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "data_type" TEXT NOT NULL DEFAULT 'numeric',
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sensor_readings" (
    "time" TIMESTAMPTZ(6) NOT NULL,
    "tag_id" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quality" SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("time","tag_id")
);

CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "assigned_to" UUID,
    "created_by" UUID,
    "machine_snapshot" JSONB,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_plans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "plan_type" TEXT NOT NULL,
    "frequency_days" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "next_due_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anomaly_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tag_id" UUID,
    "equipment_id" UUID,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    CONSTRAINT "anomaly_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_query_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "query_text" TEXT NOT NULL,
    "response_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unavailable',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_query_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "prev_hash" VARCHAR(64) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "sites_tenant_id_idx" ON "sites"("tenant_id");
CREATE INDEX "units_site_id_idx" ON "units"("site_id");
CREATE UNIQUE INDEX "equipment_tag_number_key" ON "equipment"("tag_number");
CREATE INDEX "equipment_unit_id_idx" ON "equipment"("unit_id");
CREATE UNIQUE INDEX "tags_tag_name_key" ON "tags"("tag_name");
CREATE INDEX "tags_equipment_id_idx" ON "tags"("equipment_id");
CREATE INDEX "sensor_readings_tag_id_time_idx" ON "sensor_readings"("tag_id", "time");
CREATE INDEX "work_orders_tenant_id_status_idx" ON "work_orders"("tenant_id", "status");
CREATE INDEX "work_orders_equipment_id_idx" ON "work_orders"("equipment_id");
CREATE INDEX "maintenance_plans_tenant_id_idx" ON "maintenance_plans"("tenant_id");
CREATE INDEX "anomaly_events_tenant_id_idx" ON "anomaly_events"("tenant_id");
CREATE INDEX "ai_query_log_tenant_id_idx" ON "ai_query_log"("tenant_id");
CREATE INDEX "audit_log_tenant_id_entity_entity_id_idx" ON "audit_log"("tenant_id", "entity", "entity_id");

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anomaly_events" ADD CONSTRAINT "anomaly_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anomaly_events" ADD CONSTRAINT "anomaly_events_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "anomaly_events" ADD CONSTRAINT "anomaly_events_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_query_log" ADD CONSTRAINT "ai_query_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);

CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT tag_id, time_bucket('1 hour', time) AS bucket, avg(value) AS avg_value
FROM sensor_readings
GROUP BY tag_id, bucket
WITH NO DATA;

SELECT add_retention_policy('sensor_readings', INTERVAL '2 years', if_not_exists => TRUE);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anomaly_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_query_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON "users"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_sites ON "sites"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_work_orders ON "work_orders"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_maintenance_plans ON "maintenance_plans"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_anomaly_events ON "anomaly_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_ai_query_log ON "ai_query_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_audit_log ON "audit_log"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
