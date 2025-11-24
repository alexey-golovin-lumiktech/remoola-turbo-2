/*
  Warnings:

  - The `how_did_hear_about_us` column on the `consumer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `consumer_role` column on the `organization_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "consumer_role" AS ENUM ('FOUNDER', 'FINANCE', 'MARKETING', 'CUSTOMER_SUPPORT', 'SALES', 'LEGAL', 'HUMAN_RESOURCE', 'OPERATIONS', 'COMPLIANCE', 'PRODUCT', 'ENGINEERING', 'ANALYSIS_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "how_did_hear_about_us" AS ENUM ('EMPLOYER_COMPANY', 'EMPLOYEE_CONTRACTOR', 'REFERRED_RECOMMENDED', 'EMAIL_INVITE', 'GOOGLE', 'FACEBOOK', 'TWITTER', 'LINKED_IN', 'OTHER');

-- AlterTable
ALTER TABLE "consumer" ADD COLUMN     "how_did_hear_about_us_other" VARCHAR(255),
DROP COLUMN "how_did_hear_about_us",
ADD COLUMN     "how_did_hear_about_us" "how_did_hear_about_us";

-- AlterTable
ALTER TABLE "organization_details" ADD COLUMN     "consumer_role_other" VARCHAR(255),
DROP COLUMN "consumer_role",
ADD COLUMN     "consumer_role" "consumer_role";
