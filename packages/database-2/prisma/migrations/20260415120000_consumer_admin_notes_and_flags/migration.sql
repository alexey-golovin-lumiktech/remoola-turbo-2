CREATE TABLE "consumer_admin_note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consumer_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_admin_note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consumer_flag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consumer_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "flag" TEXT NOT NULL,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "removed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(6),

    CONSTRAINT "consumer_flag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consumer_admin_note_consumer_id_created_at_idx" ON "consumer_admin_note"("consumer_id", "created_at" DESC);
CREATE INDEX "consumer_flag_consumer_id_removed_at_idx" ON "consumer_flag"("consumer_id", "removed_at");
CREATE INDEX "consumer_flag_flag_removed_at_idx" ON "consumer_flag"("flag", "removed_at");

ALTER TABLE "consumer_admin_note"
    ADD CONSTRAINT "consumer_admin_note_consumer_id_fkey"
    FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "consumer_admin_note"
    ADD CONSTRAINT "consumer_admin_note_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "consumer_flag"
    ADD CONSTRAINT "consumer_flag_consumer_id_fkey"
    FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "consumer_flag"
    ADD CONSTRAINT "consumer_flag_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "consumer_flag"
    ADD CONSTRAINT "consumer_flag_removed_by_fkey"
    FOREIGN KEY ("removed_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
