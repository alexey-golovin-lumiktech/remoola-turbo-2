-- Create enum for scheduled FX conversions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_fx_conversion_status_enum') THEN
    CREATE TYPE scheduled_fx_conversion_status_enum AS ENUM ('PENDING', 'PROCESSING', 'EXECUTED', 'FAILED', 'CANCELLED');
  END IF;
END$$;

-- Auto conversion rules
CREATE TABLE IF NOT EXISTS "wallet_auto_conversion_rule" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "from_currency" "currency_code_enum" NOT NULL,
    "to_currency" "currency_code_enum" NOT NULL,
    "target_balance" DECIMAL(9,2) NOT NULL,
    "max_convert_amount" DECIMAL(9,2),
    "min_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "next_run_at" TIMESTAMPTZ(6),
    "last_run_at" TIMESTAMPTZ(6),
    "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "wallet_auto_conversion_rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wallet_auto_conversion_rule_consumer_enabled_idx"
  ON "wallet_auto_conversion_rule" ("consumer_id", "enabled", "deleted_at");

CREATE INDEX "wallet_auto_conversion_rule_next_run_at_idx"
  ON "wallet_auto_conversion_rule" ("next_run_at");

ALTER TABLE "wallet_auto_conversion_rule"
  ADD CONSTRAINT "wallet_auto_conversion_rule_consumer_id_fkey"
  FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Scheduled FX conversions
CREATE TABLE IF NOT EXISTS "scheduled_fx_conversion" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "from_currency" "currency_code_enum" NOT NULL,
    "to_currency" "currency_code_enum" NOT NULL,
    "amount" DECIMAL(9,2) NOT NULL,
    "status" "scheduled_fx_conversion_status_enum" NOT NULL DEFAULT 'PENDING',
    "execute_at" TIMESTAMPTZ(6) NOT NULL,
    "processing_at" TIMESTAMPTZ(6),
    "executed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(1024),
    "ledger_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "scheduled_fx_conversion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scheduled_fx_conversion_consumer_status_idx"
  ON "scheduled_fx_conversion" ("consumer_id", "status");

CREATE INDEX "scheduled_fx_conversion_execute_status_idx"
  ON "scheduled_fx_conversion" ("execute_at", "status");

ALTER TABLE "scheduled_fx_conversion"
  ADD CONSTRAINT "scheduled_fx_conversion_consumer_id_fkey"
  FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
