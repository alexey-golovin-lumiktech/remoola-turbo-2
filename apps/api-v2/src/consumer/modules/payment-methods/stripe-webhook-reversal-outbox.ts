import { $Enums, type Prisma } from '@remoola/database-2';

export const STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE = `stripe.reversal.email_requested`;
export const STRIPE_REVERSAL_EMAIL_OUTBOX_AGGREGATE_TYPE = `ledger_reversal`;

export type StripeReversalEmailOutboxPayload = {
  paymentRequestId: string;
  payerId: string;
  requesterId: string | null;
  requesterEmail?: string;
  amount: number;
  currencyCode: $Enums.CurrencyCode;
  kind: `REFUND` | `CHARGEBACK`;
  reason?: string | null;
  role: `payer` | `requester`;
};

export function buildStripeReversalEmailOutboxRows(params: {
  aggregateId: string;
  idempotencyKeyBase: string;
  paymentRequestId: string;
  payerId: string;
  requesterId: string | null;
  requesterEmail?: string;
  amount: number;
  currencyCode: $Enums.CurrencyCode;
  kind: `REFUND` | `CHARGEBACK`;
  reason?: string | null;
}) {
  const basePayload = {
    paymentRequestId: params.paymentRequestId,
    payerId: params.payerId,
    requesterId: params.requesterId,
    requesterEmail: params.requesterEmail,
    amount: params.amount,
    currencyCode: params.currencyCode,
    kind: params.kind,
    reason: params.reason ?? null,
  };
  const roles: Array<StripeReversalEmailOutboxPayload[`role`]> =
    params.requesterId || params.requesterEmail ? [`payer`, `requester`] : [`payer`];

  return roles.map((role) => ({
    eventType: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
    aggregateType: STRIPE_REVERSAL_EMAIL_OUTBOX_AGGREGATE_TYPE,
    aggregateId: params.aggregateId,
    idempotencyKey: `${STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE}:${params.idempotencyKeyBase}:${role}`,
    payload: {
      ...basePayload,
      role,
    } satisfies StripeReversalEmailOutboxPayload as Prisma.InputJsonValue,
  }));
}

export function parseStripeReversalEmailOutboxPayload(payload: Prisma.JsonValue): StripeReversalEmailOutboxPayload {
  if (!payload || typeof payload !== `object` || Array.isArray(payload)) {
    throw new Error(`Invalid Stripe reversal email outbox payload`);
  }
  const value = payload as Record<string, unknown>;
  if (
    typeof value.paymentRequestId !== `string` ||
    typeof value.payerId !== `string` ||
    !(typeof value.requesterId === `string` || value.requesterId === null) ||
    !(typeof value.requesterEmail === `string` || value.requesterEmail == null) ||
    typeof value.amount !== `number` ||
    !Object.values($Enums.CurrencyCode).includes(value.currencyCode as $Enums.CurrencyCode) ||
    (value.kind !== `REFUND` && value.kind !== `CHARGEBACK`) ||
    !(typeof value.reason === `string` || value.reason == null) ||
    (value.role !== `payer` && value.role !== `requester`)
  ) {
    throw new Error(`Invalid Stripe reversal email outbox payload`);
  }
  const requesterId = typeof value.requesterId === `string` ? value.requesterId : null;

  return {
    paymentRequestId: value.paymentRequestId,
    payerId: value.payerId,
    requesterId,
    requesterEmail: typeof value.requesterEmail === `string` ? value.requesterEmail : undefined,
    amount: value.amount,
    currencyCode: value.currencyCode as $Enums.CurrencyCode,
    kind: value.kind,
    reason: typeof value.reason === `string` ? value.reason : null,
    role: value.role,
  };
}
