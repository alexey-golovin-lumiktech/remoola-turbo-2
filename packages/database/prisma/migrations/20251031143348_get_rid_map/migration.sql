-- RenameForeignKey
ALTER TABLE "consumer" RENAME CONSTRAINT "consumer_address_details_id_foreign" TO "consumer_address_details_id_fkey";

-- RenameForeignKey
ALTER TABLE "consumer" RENAME CONSTRAINT "consumer_google_profile_details_id_foreign" TO "consumer_google_profile_details_id_fkey";

-- RenameForeignKey
ALTER TABLE "consumer" RENAME CONSTRAINT "consumer_organization_details_id_foreign" TO "consumer_organization_details_id_fkey";

-- RenameForeignKey
ALTER TABLE "consumer" RENAME CONSTRAINT "consumer_personal_details_id_foreign" TO "consumer_personal_details_id_fkey";

-- RenameForeignKey
ALTER TABLE "consumer_resource" RENAME CONSTRAINT "consumer_resource_consumer_id_foreign" TO "consumer_resource_consumer_id_fkey";

-- RenameForeignKey
ALTER TABLE "consumer_resource" RENAME CONSTRAINT "consumer_resource_resource_id_foreign" TO "consumer_resource_resource_id_fkey";

-- RenameForeignKey
ALTER TABLE "contact" RENAME CONSTRAINT "contact_consumer_id_foreign" TO "contact_consumer_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_method" RENAME CONSTRAINT "payment_method_billing_details_id_foreign" TO "payment_method_billing_details_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_method" RENAME CONSTRAINT "payment_method_consumer_id_foreign" TO "payment_method_consumer_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_request" RENAME CONSTRAINT "payment_request_payer_id_foreign" TO "payment_request_payer_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_request" RENAME CONSTRAINT "payment_request_requester_id_foreign" TO "payment_request_requester_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_request_attachment" RENAME CONSTRAINT "payment_request_attachment_payment_request_id_foreign" TO "payment_request_attachment_payment_request_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_request_attachment" RENAME CONSTRAINT "payment_request_attachment_requester_id_foreign" TO "payment_request_attachment_requester_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_request_attachment" RENAME CONSTRAINT "payment_request_attachment_resource_id_foreign" TO "payment_request_attachment_resource_id_fkey";

-- RenameForeignKey
ALTER TABLE "reset_password" RENAME CONSTRAINT "reset_password_consumer_id_foreign" TO "reset_password_consumer_id_fkey";

-- RenameForeignKey
ALTER TABLE "transaction" RENAME CONSTRAINT "transaction_consumer_id_foreign" TO "transaction_consumer_id_fkey";

-- RenameForeignKey
ALTER TABLE "transaction" RENAME CONSTRAINT "transaction_payment_request_id_foreign" TO "transaction_payment_request_id_fkey";

-- RenameIndex
ALTER INDEX "admin_email_unique" RENAME TO "admin_email_key";

-- RenameIndex
ALTER INDEX "consumer_email_unique" RENAME TO "consumer_email_key";

-- RenameIndex
ALTER INDEX "consumer_resource_consumer_id_resource_id_unique" RENAME TO "consumer_resource_consumer_id_resource_id_key";

-- RenameIndex
ALTER INDEX "exchange_rate_from_currency_to_currency_unique" RENAME TO "exchange_rate_from_currency_to_currency_key";

-- RenameIndex
ALTER INDEX "payment_method_type_last4_consumer_id_unique" RENAME TO "payment_method_type_last4_consumer_id_key";

-- RenameIndex
ALTER INDEX "transaction_payment_request_id_code_unique" RENAME TO "transaction_payment_request_id_code_key";
