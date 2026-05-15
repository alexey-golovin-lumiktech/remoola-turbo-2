import { $Enums, type Prisma } from '@remoola/database-2';

export const ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE = `admin.refund.finalization_requested`;
const ADMIN_REFUND_FINALIZATION_OUTBOX_AGGREGATE_TYPE = `admin_refund_reversal`;

export type AdminRefundFinalizationOutboxPayload = {
  paymentRequestId: string;
  ledgerId: string;
  adminId: string;
  stripePaymentIntentId: string;
  idempotencyKeyBase: string;
  existingStripeRefundId: string | null;
  amount: string;
  currencyCode: $Enums.CurrencyCode;
  reason: string | null;
};

export function buildAdminRefundFinalizationOutboxIdempotencyKey(idempotencyKeyBase: string): string {
  return `${ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE}:${idempotencyKeyBase}`;
}

export function buildAdminRefundFinalizationOutboxRow(payload: AdminRefundFinalizationOutboxPayload) {
  return {
    eventType: ADMIN_REFUND_FINALIZATION_OUTBOX_EVENT_TYPE,
    aggregateType: ADMIN_REFUND_FINALIZATION_OUTBOX_AGGREGATE_TYPE,
    aggregateId: payload.ledgerId,
    idempotencyKey: buildAdminRefundFinalizationOutboxIdempotencyKey(payload.idempotencyKeyBase),
    payload: payload satisfies AdminRefundFinalizationOutboxPayload as Prisma.InputJsonValue,
  };
}

export function parseAdminRefundFinalizationOutboxPayload(
  payload: Prisma.JsonValue,
): AdminRefundFinalizationOutboxPayload {
  if (!payload || typeof payload !== `object` || Array.isArray(payload)) {
    throw new Error(`Invalid admin refund finalization outbox payload`);
  }
  const value = payload as Record<string, unknown>;
  if (
    typeof value.paymentRequestId !== `string` ||
    typeof value.ledgerId !== `string` ||
    typeof value.adminId !== `string` ||
    typeof value.stripePaymentIntentId !== `string` ||
    typeof value.idempotencyKeyBase !== `string` ||
    !(typeof value.existingStripeRefundId === `string` || value.existingStripeRefundId === null) ||
    typeof value.amount !== `string` ||
    !Object.values($Enums.CurrencyCode).includes(value.currencyCode as $Enums.CurrencyCode) ||
    !(typeof value.reason === `string` || value.reason === null)
  ) {
    throw new Error(`Invalid admin refund finalization outbox payload`);
  }

  return {
    paymentRequestId: value.paymentRequestId,
    ledgerId: value.ledgerId,
    adminId: value.adminId,
    stripePaymentIntentId: value.stripePaymentIntentId,
    idempotencyKeyBase: value.idempotencyKeyBase,
    existingStripeRefundId: value.existingStripeRefundId as string | null,
    amount: value.amount,
    currencyCode: value.currencyCode as $Enums.CurrencyCode,
    reason: value.reason as string | null,
  };
}
