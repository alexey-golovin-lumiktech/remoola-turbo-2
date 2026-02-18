-- Add missing mandatory timestamps for tag tables.
-- Safe rollout: add nullable columns, backfill existing rows, then enforce NOT NULL + defaults.

-- AlterTable
ALTER TABLE "document_tag"
ADD COLUMN "created_at" TIMESTAMPTZ(6),
ADD COLUMN "updated_at" TIMESTAMPTZ(6);

-- Backfill existing rows
UPDATE "document_tag"
SET "created_at" = COALESCE("created_at", now()),
    "updated_at" = COALESCE("updated_at", now())
WHERE "created_at" IS NULL
   OR "updated_at" IS NULL;

-- Enforce defaults and NOT NULL
ALTER TABLE "document_tag"
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "resource_tag"
ADD COLUMN "created_at" TIMESTAMPTZ(6),
ADD COLUMN "updated_at" TIMESTAMPTZ(6);

-- Backfill existing rows
UPDATE "resource_tag"
SET "created_at" = COALESCE("created_at", now()),
    "updated_at" = COALESCE("updated_at", now())
WHERE "created_at" IS NULL
   OR "updated_at" IS NULL;

-- Enforce defaults and NOT NULL
ALTER TABLE "resource_tag"
ALTER COLUMN "created_at" SET DEFAULT now(),
ALTER COLUMN "updated_at" SET DEFAULT now(),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;
