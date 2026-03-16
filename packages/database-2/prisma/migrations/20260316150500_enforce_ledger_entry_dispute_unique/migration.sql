-- Enforce dispute dedupe at DB level to match Prisma @@unique contract.
-- Preferred rollout: create the unique index CONCURRENTLY before this migration,
-- then attach the table constraint using the existing index.
-- Fallback for transactional migration environments (e.g. CI ephemeral DB):
-- create the unique index in-migration when missing.
DO $$
DECLARE
  has_attachable_index BOOLEAN;
  dispute_row_count BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ledger_entry_dispute"
    GROUP BY "ledger_entry_id", "stripe_dispute_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add unique constraint ledger_entry_dispute(ledger_entry_id, stripe_dispute_id): duplicate rows exist';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class idx
    JOIN pg_namespace ns ON ns.oid = idx.relnamespace
    JOIN pg_index i ON i.indexrelid = idx.oid
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    JOIN LATERAL (
      SELECT array_agg(a.attname::text ORDER BY key_col.ord) AS key_columns
      FROM unnest(i.indkey) WITH ORDINALITY AS key_col(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = tbl.oid AND a.attnum = key_col.attnum
      WHERE key_col.ord <= i.indnkeyatts
        AND NOT a.attisdropped
    ) cols ON TRUE
    WHERE idx.relkind = 'i'
      AND idx.relname = 'ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key'
      AND ns.nspname = current_schema()
      AND tbl.relname = 'ledger_entry_dispute'
      AND i.indisunique
      AND i.indisvalid
      AND i.indpred IS NULL
      AND i.indexprs IS NULL
      AND i.indnkeyatts = 2
      AND cols.key_columns = ARRAY['ledger_entry_id', 'stripe_dispute_id']::text[]
  ) INTO has_attachable_index;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key'
      AND conrelid = 'ledger_entry_dispute'::regclass
  ) THEN
    IF has_attachable_index THEN
      ALTER TABLE "ledger_entry_dispute"
        ADD CONSTRAINT "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
        UNIQUE USING INDEX "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key";
    ELSE
      SELECT COUNT(*) INTO dispute_row_count FROM "ledger_entry_dispute";
      IF dispute_row_count > 0 THEN
        RAISE NOTICE
          'Missing precreated concurrent index ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key. Falling back to in-migration unique index creation (transactional lock risk).';
      END IF;

      CREATE UNIQUE INDEX IF NOT EXISTS
        "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
      ON "ledger_entry_dispute" ("ledger_entry_id", "stripe_dispute_id");

      IF EXISTS (
        SELECT 1
        FROM pg_class idx
        JOIN pg_namespace ns ON ns.oid = idx.relnamespace
        JOIN pg_index i ON i.indexrelid = idx.oid
        JOIN pg_class tbl ON tbl.oid = i.indrelid
        JOIN LATERAL (
          SELECT array_agg(a.attname::text ORDER BY key_col.ord) AS key_columns
          FROM unnest(i.indkey) WITH ORDINALITY AS key_col(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = tbl.oid AND a.attnum = key_col.attnum
          WHERE key_col.ord <= i.indnkeyatts
            AND NOT a.attisdropped
        ) cols ON TRUE
        WHERE idx.relkind = 'i'
          AND idx.relname = 'ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key'
          AND ns.nspname = current_schema()
          AND tbl.relname = 'ledger_entry_dispute'
          AND i.indisunique
          AND i.indisvalid
          AND i.indpred IS NULL
          AND i.indexprs IS NULL
          AND i.indnkeyatts = 2
          AND cols.key_columns = ARRAY['ledger_entry_id', 'stripe_dispute_id']::text[]
      ) THEN
        ALTER TABLE "ledger_entry_dispute"
          ADD CONSTRAINT "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
          UNIQUE USING INDEX "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key";
      ELSE
        ALTER TABLE "ledger_entry_dispute"
          ADD CONSTRAINT "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
          UNIQUE ("ledger_entry_id", "stripe_dispute_id");
      END IF;
    END IF;
  END IF;
END $$;
