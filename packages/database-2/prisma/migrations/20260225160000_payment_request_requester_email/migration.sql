-- Allow start payment to unregistered recipient: store requester email when requester_id is null.
-- Mirror of payer_id/payer_email: requester_id becomes optional, requester_email stores email.
ALTER TABLE "payment_request"
  ADD COLUMN "requester_email" TEXT;

ALTER TABLE "payment_request"
  ALTER COLUMN "requester_id" DROP NOT NULL;

ALTER TABLE "payment_request" DROP CONSTRAINT IF EXISTS "payment_request_requester_id_fkey";
ALTER TABLE "payment_request"
  ADD CONSTRAINT "payment_request_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
