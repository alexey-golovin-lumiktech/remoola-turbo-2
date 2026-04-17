CREATE INDEX "resource_created_at_idx" ON "resource"("created_at" DESC);

CREATE INDEX "resource_deleted_at_created_at_idx" ON "resource"("deleted_at", "created_at" DESC);

CREATE INDEX "resource_access_deleted_at_created_at_idx"
ON "resource"("access", "deleted_at", "created_at" DESC);

CREATE INDEX "resource_mimetype_deleted_at_created_at_idx"
ON "resource"("mimetype", "deleted_at", "created_at" DESC);

CREATE INDEX "resource_size_deleted_at_created_at_idx"
ON "resource"("size", "deleted_at", "created_at" DESC);
