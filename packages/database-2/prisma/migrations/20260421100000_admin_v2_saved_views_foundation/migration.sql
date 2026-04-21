CREATE TABLE "saved_view" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "workspace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "saved_view_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saved_view_workspace_check"
      CHECK ("workspace" IN (
        'ledger_anomalies'
      )),
    CONSTRAINT "saved_view_name_length_check"
      CHECK (char_length("name") BETWEEN 1 AND 100),
    CONSTRAINT "saved_view_description_length_check"
      CHECK ("description" IS NULL OR char_length("description") <= 500),
    CONSTRAINT "saved_view_query_payload_size_check"
      CHECK (octet_length("query_payload"::text) <= 4096)
);

ALTER TABLE "saved_view"
ADD CONSTRAINT "saved_view_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "saved_view_owner_id_workspace_deleted_at_idx"
ON "saved_view"("owner_id", "workspace", "deleted_at");

CREATE UNIQUE INDEX "idx_saved_view_active_owner_workspace_name"
ON "saved_view"("owner_id", "workspace", "name")
WHERE "deleted_at" IS NULL;
