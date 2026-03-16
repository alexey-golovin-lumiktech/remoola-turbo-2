-- Additive only: append-only consumer action log table. No destructive changes.
-- Rollback policy: prefer forward-fix; do not treat dropping this audit table as routine rollback.
CREATE TABLE "consumer_action_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_id" TEXT NOT NULL,
    "consumer_id" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_action_log_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

DO $$
DECLARE
    month_offset INTEGER;
    partition_start TIMESTAMPTZ;
    partition_end TIMESTAMPTZ;
    partition_name TEXT;
    utc_month_start TIMESTAMPTZ;
BEGIN
    -- Use UTC month boundaries so partition names/ranges match app maintenance logic.
    utc_month_start := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

    -- Ensure inserts succeed immediately after deploy across month boundaries,
    -- including longer scheduler outages before rollover windows.
    FOR month_offset IN 0..12 LOOP
        partition_start := utc_month_start + (month_offset || ' month')::interval;
        partition_end := partition_start + interval '1 month';
        partition_name := format('consumer_action_log_p%s', to_char(partition_start, 'YYYYMM'));

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "consumer_action_log" FOR VALUES FROM (%L) TO (%L);',
            partition_name,
            partition_start,
            partition_end
        );
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS "consumer_action_log_pdefault"
PARTITION OF "consumer_action_log"
DEFAULT;

CREATE INDEX "consumer_action_log_device_id_created_at_idx" ON "consumer_action_log"("device_id", "created_at");
CREATE INDEX "consumer_action_log_consumer_id_created_at_idx" ON "consumer_action_log"("consumer_id", "created_at");
CREATE INDEX "consumer_action_log_consumer_id_device_id_idx" ON "consumer_action_log"("consumer_id", "device_id");
CREATE INDEX "consumer_action_log_action_created_at_idx" ON "consumer_action_log"("action", "created_at");

ALTER TABLE "consumer_action_log" ADD CONSTRAINT "consumer_action_log_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
