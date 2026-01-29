/*
  Warnings:

  - Made the column `account_type` on table `consumer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "consumer" ALTER COLUMN "account_type" SET NOT NULL;
