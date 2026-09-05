-- Phase 2: live telemetry scoring, ISA-18.2 alarms, energy/carbon, SafeOps outbox

ALTER TABLE "tags"
  ADD COLUMN "alarm_ll" DOUBLE PRECISION,
  ADD COLUMN "alarm_lo" DOUBLE PRECISION,
  ADD COLUMN "alarm_hi" DOUBLE PRECISION,
  ADD COLUMN "alarm_hh" DOUBLE PRECISION;

ALTER TABLE "anomaly_events"
  ALTER COLUMN "status" SET DEFAULT 'open',
  ADD COLUMN "method" TEXT NOT NULL DEFAULT 'isolation_forest',
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "contributors" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "acknowledged_at" TIMESTAMPTZ(6),
  ADD COLUMN "notified_safeops_at" TIMESTAMPTZ(6);

CREATE INDEX "anomaly_events_tenant_id_status_idx" ON "anomaly_events"("tenant_id", "status");
CREATE INDEX "anomaly_events_equipment_id_detected_at_idx" ON "anomaly_events"("equipment_id", "detected_at");

CREATE TABLE "alarm_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "cleared_at" TIMESTAMPTZ(6),
    "priority" TEXT NOT NULL,
    "alarm_type" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'active',
    "value" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    CONSTRAINT "alarm_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alarm_events_tenant_id_started_at_idx" ON "alarm_events"("tenant_id", "started_at");
CREATE INDEX "alarm_events_tag_id_state_idx" ON "alarm_events"("tag_id", "state");

ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alarm_events" ADD CONSTRAINT "alarm_events_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "energy_meters" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID,
    "equipment_id" UUID,
    "tag_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "emission_factor_kg_co2e" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "energy_meters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "energy_meters_code_key" ON "energy_meters"("code");
CREATE INDEX "energy_meters_tenant_id_idx" ON "energy_meters"("tenant_id");

ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "energy_readings" (
    "time" TIMESTAMPTZ(6) NOT NULL,
    "meter_id" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "energy_readings_pkey" PRIMARY KEY ("time","meter_id")
);

CREATE INDEX "energy_readings_meter_id_time_idx" ON "energy_readings"("meter_id", "time");
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "energy_meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

SELECT create_hypertable('energy_readings', 'time', if_not_exists => TRUE);
SELECT add_retention_policy('energy_readings', INTERVAL '2 years', if_not_exists => TRUE);

CREATE TABLE "integration_deliveries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "target" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ(6),
    CONSTRAINT "integration_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_deliveries_tenant_id_status_idx" ON "integration_deliveries"("tenant_id", "status");
ALTER TABLE "integration_deliveries" ADD CONSTRAINT "integration_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alarm_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "energy_meters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_deliveries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_alarm_events ON "alarm_events"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_energy_meters ON "energy_meters"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_integration_deliveries ON "integration_deliveries"
  USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id = current_setting('app.tenant_id')::uuid);
