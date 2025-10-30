/*
  Warnings:

  - The `type` column on the `admin` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `account_type` column on the `consumer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contractor_kind` column on the `consumer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `size` column on the `organization_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency_code` column on the `payment_request` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `payment_request` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `payment_request` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `legal_status` column on the `personal_details` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `access` column on the `resource` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fees_type` column on the `transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `from_currency` on the `exchange_rate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `to_currency` on the `exchange_rate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `payment_method` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currency_code` on the `transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `action_type` on the `transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "admin" DROP COLUMN "type",
ADD COLUMN     "type" "admin_type_enum" NOT NULL DEFAULT 'Admin';

-- AlterTable
ALTER TABLE "consumer" DROP COLUMN "account_type",
ADD COLUMN     "account_type" "account_type_enum",
DROP COLUMN "contractor_kind",
ADD COLUMN     "contractor_kind" "contractor_kind_enum";

-- AlterTable
ALTER TABLE "exchange_rate" DROP COLUMN "from_currency",
ADD COLUMN     "from_currency" "currency_code_enum" NOT NULL,
DROP COLUMN "to_currency",
ADD COLUMN     "to_currency" "currency_code_enum" NOT NULL;

-- AlterTable
ALTER TABLE "organization_details" DROP COLUMN "size",
ADD COLUMN     "size" "organization_size_enum" NOT NULL DEFAULT '1-10 team members';

-- AlterTable
ALTER TABLE "payment_method" DROP COLUMN "type",
ADD COLUMN     "type" "payment_method_enum" NOT NULL;

-- AlterTable
ALTER TABLE "payment_request" DROP COLUMN "currency_code",
ADD COLUMN     "currency_code" "currency_code_enum" NOT NULL DEFAULT 'USD',
DROP COLUMN "status",
ADD COLUMN     "status" "transaction_status_enum" NOT NULL DEFAULT 'Draft',
DROP COLUMN "type",
ADD COLUMN     "type" "payment_method_enum" NOT NULL DEFAULT 'Credit Card';

-- AlterTable
ALTER TABLE "personal_details" DROP COLUMN "legal_status",
ADD COLUMN     "legal_status" "legal_status_enum";

-- AlterTable
ALTER TABLE "resource" DROP COLUMN "access",
ADD COLUMN     "access" "resource_access_enum" NOT NULL DEFAULT 'Public';

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "type",
ADD COLUMN     "type" "transaction_type_enum" NOT NULL,
DROP COLUMN "currency_code",
ADD COLUMN     "currency_code" "currency_code_enum" NOT NULL,
DROP COLUMN "action_type",
ADD COLUMN     "action_type" "transaction_action_enum" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "transaction_status_enum" NOT NULL,
DROP COLUMN "fees_type",
ADD COLUMN     "fees_type" "fees_type_enum" DEFAULT 'No Fees Included';

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_from_currency_to_currency_unique" ON "exchange_rate"("from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_type_last4_consumer_id_unique" ON "payment_method"("type", "last4", "consumer_id");
