-- CreateTable
CREATE TABLE "document_tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "document_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "resource_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "resource_tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_tag_name_key" ON "document_tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_tag_resource_id_tag_id_key" ON "resource_tag"("resource_id", "tag_id");

-- AddForeignKey
ALTER TABLE "resource_tag" ADD CONSTRAINT "resource_tag_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tag" ADD CONSTRAINT "resource_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "document_tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
