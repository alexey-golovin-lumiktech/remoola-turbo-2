-- Allow payment requests for email-only recipients (no consumer account yet).
ALTER TABLE "payment_request"
  ALTER COLUMN "payer_id" DROP NOT NULL;

ALTER TABLE "payment_request"
  ADD COLUMN "payer_email" TEXT;

-- Preserve existing FK semantics while allowing null payer_id.
ALTER TABLE "payment_request" DROP CONSTRAINT "payment_request_payer_id_fkey";
ALTER TABLE "payment_request"
  ADD CONSTRAINT "payment_request_payer_id_fkey"
  FOREIGN KEY ("payer_id") REFERENCES "consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
