import { $Enums, Prisma } from '@remoola/database-2';

import { type AdminRefundFinalizationOutboxPayload } from './admin-v2-payment-reversal-refund-outbox';
import { type ExistingReversalRow } from './admin-v2-payment-reversal.repository';
import { type PaymentReversalCreateInput } from './admin-v2-payment-reversal.types';
import { toMoneyDecimal, type MoneyDecimalInput } from '../../shared/money-decimal.utils';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

type ExistingReversalResultContext = {
  existingReversal: ExistingReversalRow;
  requestAmount: Prisma.Decimal;
  alreadyReversed: Prisma.Decimal;
  kind: PaymentReversalCreateInput[`kind`];
  idempotencyKeyBase: string;
  stripePaymentIntentId: string | null;
  needsRefundFinalize: boolean;
};

type ReversalBaseMetadataInput = {
  paymentRail: $Enums.PaymentRail;
  kind: PaymentReversalCreateInput[`kind`];
  stripeObjectType: `refund` | `manual_chargeback`;
  reason: string | null;
  stripePaymentIntentId: string | null;
  stripeRefundId: string | null;
  idempotencyKeyBase: string;
};

type PayerReversalCreateInputContext = {
  ledgerId: string;
  paymentRequestId: string;
  payerId: string;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal;
  adminId: string;
  baseMetadata: ReversalBaseMetadata;
  originalLedgerId: string | null;
  idempotencyKeyBase: string;
  stripeRefundId: string | null;
};

type RequesterReversalCreateInputContext = {
  ledgerId: string;
  paymentRequestId: string;
  requesterId: string;
  requesterReversalType: $Enums.LedgerEntryType;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal;
  adminId: string;
  baseMetadata: ReversalBaseMetadata;
  requesterSettlementLedgerId: string | null;
  idempotencyKeyBase: string;
  stripeRefundId: string | null;
};

type ReversalBaseMetadata = ReturnType<typeof buildReversalBaseMetadata>;

function buildRemainingAmount(requestAmount: Prisma.Decimal, alreadyReversed: Prisma.Decimal): Prisma.Decimal {
  const remaining = requestAmount.minus(alreadyReversed);
  return remaining.gt(0) ? remaining : new Prisma.Decimal(0);
}

function buildReversalCreateInput(params: {
  ledgerId: string;
  paymentRequestId: string;
  consumerId: string;
  type: $Enums.LedgerEntryType;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal;
  adminId: string;
  baseMetadata: ReversalBaseMetadata;
  reversalOfLedgerId: string | null;
  idempotencyKey: string;
  stripeRefundId: string | null;
}): Prisma.LedgerEntryModelUncheckedCreateInput {
  return {
    ledgerId: params.ledgerId,
    consumerId: params.consumerId,
    paymentRequestId: params.paymentRequestId,
    type: params.type,
    currencyCode: params.currencyCode,
    status: params.status,
    amount: params.amount,
    createdBy: params.adminId,
    updatedBy: params.adminId,
    metadata: {
      ...params.baseMetadata,
      reversalOfLedgerId: params.reversalOfLedgerId,
    } as Prisma.InputJsonValue,
    idempotencyKey: params.idempotencyKey,
    stripeId: params.stripeRefundId ?? undefined,
  };
}

export function getExistingReversalStatus(existingReversal: ExistingReversalRow): $Enums.TransactionStatus | null {
  if (!existingReversal.status) {
    return null;
  }
  return getEffectiveLedgerStatus(existingReversal as Required<Pick<ExistingReversalRow, `status`>>);
}

export function isReusableExistingReversal(existingReversal: ExistingReversalRow): boolean {
  const status = getExistingReversalStatus(existingReversal);
  return (
    status === $Enums.TransactionStatus.COMPLETED ||
    status === $Enums.TransactionStatus.PENDING ||
    status === $Enums.TransactionStatus.DENIED
  );
}

export function buildExistingReversalResult(params: ExistingReversalResultContext): {
  ledgerId: string;
  amount: Prisma.Decimal;
  remaining: Prisma.Decimal;
  kind: PaymentReversalCreateInput[`kind`];
  alreadyExisted: true;
  idempotencyKeyBase: string;
  stripePaymentIntentId: string | null;
  existingStripeRefundId: string | null;
  needsRefundFinalize: boolean;
} {
  return {
    ledgerId: params.existingReversal.ledgerId,
    amount: toMoneyDecimal(params.existingReversal.amount),
    remaining: buildRemainingAmount(params.requestAmount, params.alreadyReversed),
    kind: params.kind,
    alreadyExisted: true,
    idempotencyKeyBase: params.idempotencyKeyBase,
    stripePaymentIntentId: params.stripePaymentIntentId,
    existingStripeRefundId: params.existingReversal.stripeId ?? null,
    needsRefundFinalize: params.needsRefundFinalize,
  };
}

export function buildRefundFinalizationPayload(params: {
  paymentRequestId: string;
  ledgerId: string;
  adminId: string;
  stripePaymentIntentId: string;
  idempotencyKeyBase: string;
  existingStripeRefundId: string | null;
  amount: MoneyDecimalInput;
  currencyCode: $Enums.CurrencyCode;
  reason: string | null;
}): AdminRefundFinalizationOutboxPayload {
  return {
    paymentRequestId: params.paymentRequestId,
    ledgerId: params.ledgerId,
    adminId: params.adminId,
    stripePaymentIntentId: params.stripePaymentIntentId,
    idempotencyKeyBase: params.idempotencyKeyBase,
    existingStripeRefundId: params.existingStripeRefundId,
    amount: toMoneyDecimal(params.amount).toString(),
    currencyCode: params.currencyCode,
    reason: params.reason,
  };
}

export function buildReversalBaseMetadata(params: ReversalBaseMetadataInput) {
  return {
    rail: params.paymentRail,
    reversalKind: params.kind,
    source: `admin`,
    stripeObjectType: params.stripeObjectType,
    reason: params.reason,
    stripePaymentIntentId: params.stripePaymentIntentId,
    stripeRefundId: params.stripeRefundId,
    idempotencyKeyBase: params.idempotencyKeyBase,
  } as const;
}

export function buildPayerReversalCreateInput(
  params: PayerReversalCreateInputContext,
): Prisma.LedgerEntryModelUncheckedCreateInput {
  return buildReversalCreateInput({
    ledgerId: params.ledgerId,
    paymentRequestId: params.paymentRequestId,
    consumerId: params.payerId,
    type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
    currencyCode: params.currencyCode,
    status: params.status,
    amount: params.amount,
    adminId: params.adminId,
    baseMetadata: params.baseMetadata,
    reversalOfLedgerId: params.originalLedgerId,
    idempotencyKey: `${params.idempotencyKeyBase}:payer`,
    stripeRefundId: params.stripeRefundId,
  });
}

export function buildRequesterReversalCreateInput(
  params: RequesterReversalCreateInputContext,
): Prisma.LedgerEntryModelUncheckedCreateInput {
  return buildReversalCreateInput({
    ledgerId: params.ledgerId,
    paymentRequestId: params.paymentRequestId,
    consumerId: params.requesterId,
    type: params.requesterReversalType,
    currencyCode: params.currencyCode,
    status: params.status,
    amount: params.amount.negated(),
    adminId: params.adminId,
    baseMetadata: params.baseMetadata,
    reversalOfLedgerId: params.requesterSettlementLedgerId,
    idempotencyKey: `${params.idempotencyKeyBase}:requester`,
    stripeRefundId: params.stripeRefundId,
  });
}
