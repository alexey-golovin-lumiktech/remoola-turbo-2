/*
  Warnings:

  - You are about to drop the column `first_name` on the `consumer` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `consumer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "consumer" DROP COLUMN "first_name",
DROP COLUMN "last_name";

-- AlterTable
ALTER TABLE "personal_details" ADD COLUMN     "first_name" VARCHAR(255),
ADD COLUMN     "last_name" VARCHAR(255);
