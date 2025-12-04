/*
  Warnings:

  - Made the column `password` on table `consumer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salt` on table `consumer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "consumer" ALTER COLUMN "verified" DROP NOT NULL,
ALTER COLUMN "legal_verified" DROP NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "salt" SET NOT NULL;
