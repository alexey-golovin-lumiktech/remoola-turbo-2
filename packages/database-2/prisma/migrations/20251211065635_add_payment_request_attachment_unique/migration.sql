/*
  Warnings:

  - A unique constraint covering the columns `[payment_request_id,requester_id,resource_id]` on the table `payment_request_attachment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "payment_request_attachment_payment_request_id_requester_id__key" ON "payment_request_attachment"("payment_request_id", "requester_id", "resource_id");
