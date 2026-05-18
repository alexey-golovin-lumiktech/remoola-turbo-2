import { createHash } from 'crypto';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  moneyDecimalToNumber,
  toCanonicalMoneyString,
  type MoneyDecimalInput,
  toMoneyDecimal,
} from './money-decimal.utils';
import { getEffectiveLedgerStatus } from './transaction-status.utils';

type PaymentReversalKind = `REFUND` | `CHARGEBACK`;

type StrictReversalDecimalAmountResolution =
  | {
      ok: true;
      finalAmount: Prisma.Decimal;
      remainingBefore: Prisma.Decimal;
    }
  | {
      ok: false;
      reason: `ALREADY_FULLY_REVERSED` | `EXCEEDS_REMAINING_BALANCE`;
      remainingBefore: Prisma.Decimal;
    };

export function deriveEffectivePaymentRequestStatus(
  paymentRequest:
    | {
        status: $Enums.TransactionStatus;
        ledgerEntries?: Array<{
          status: $Enums.TransactionStatus;
          createdAt: Date;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }>;
      }
    | null
    | undefined,
): $Enums.TransactionStatus | null {
  if (!paymentRequest) return null;
  const latestEntry = [...(paymentRequest.ledgerEntries ?? [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  return latestEntry ? getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
}

export function calculateAlreadyReversedAmount(
  reversalEntries: Array<{
    amount: MoneyDecimalInput;
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }>,
): number {
  return moneyDecimalToNumber(calculateAlreadyReversedDecimalAmount(reversalEntries));
}

export function calculateAlreadyReversedDecimalAmount(
  reversalEntries: Array<{
    amount: MoneyDecimalInput;
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }>,
): Prisma.Decimal {
  return reversalEntries.reduce((sum, entry) => {
    const effectiveStatus = getEffectiveLedgerStatus(entry);
    if (
      effectiveStatus !== $Enums.TransactionStatus.COMPLETED &&
      effectiveStatus !== $Enums.TransactionStatus.PENDING
    ) {
      return sum;
    }
    const amount = toMoneyDecimal(entry.amount);
    return amount.gt(0) ? sum.plus(amount) : sum;
  }, new Prisma.Decimal(0));
}

export function resolveStrictReversalDecimalAmount(params: {
  requestAmount: MoneyDecimalInput;
  alreadyReversed: MoneyDecimalInput;
  requestedAmount?: MoneyDecimalInput;
}): StrictReversalDecimalAmountResolution {
  const requestAmount = toMoneyDecimal(params.requestAmount, `requestAmount`);
  const alreadyReversed = toMoneyDecimal(params.alreadyReversed, `alreadyReversed`);
  const remainingBefore = requestAmount.minus(alreadyReversed);
  if (remainingBefore.lte(0)) {
    return { ok: false, reason: `ALREADY_FULLY_REVERSED`, remainingBefore };
  }

  const finalAmount = params.requestedAmount == null ? remainingBefore : toMoneyDecimal(params.requestedAmount);
  if (finalAmount.gt(remainingBefore)) {
    return { ok: false, reason: `EXCEEDS_REMAINING_BALANCE`, remainingBefore };
  }

  return { ok: true, finalAmount, remainingBefore };
}

export function capExternalReversalAmount(params: {
  requestAmount: number;
  alreadyReversed: number;
  externalAmount: number;
}) {
  const capped = capExternalReversalDecimalAmount(params);
  return {
    finalAmount: moneyDecimalToNumber(capped.finalAmount),
    remainingBefore: moneyDecimalToNumber(capped.remainingBefore),
  };
}

function capExternalReversalDecimalAmount(params: {
  requestAmount: MoneyDecimalInput;
  alreadyReversed: MoneyDecimalInput;
  externalAmount: MoneyDecimalInput;
}) {
  const remainingBefore = toMoneyDecimal(params.requestAmount, `requestAmount`).minus(
    toMoneyDecimal(params.alreadyReversed, `alreadyReversed`),
  );
  const externalAmount = toMoneyDecimal(params.externalAmount, `externalAmount`);
  return {
    finalAmount: externalAmount.lt(remainingBefore) ? externalAmount : remainingBefore,
    remainingBefore,
  };
}

export function buildAdminPaymentReversalIdempotencyKey(payload: {
  paymentRequestId: string;
  kind: PaymentReversalKind;
  amount: MoneyDecimalInput;
  reason?: string | null;
}) {
  const normalized = JSON.stringify({
    paymentRequestId: payload.paymentRequestId,
    kind: payload.kind,
    amount: toCanonicalMoneyString(payload.amount),
    reason: payload.reason?.trim() || null,
  });
  return createHash(`sha256`).update(normalized).digest(`hex`);
}

export function buildStripeReversalLedgerIdempotencyKeys(params: {
  kind: PaymentReversalKind;
  stripeObjectId?: string | null;
}) {
  if (params.stripeObjectId == null) {
    return { payer: undefined, requester: undefined };
  }

  const kindLower = params.kind.toLowerCase();
  return {
    payer: `reversal:${kindLower}:${params.stripeObjectId}:payer`,
    requester: `reversal:${kindLower}:${params.stripeObjectId}:requester`,
  };
}

export function getRequesterReversalEntryType(params: {
  settlementEntryType: $Enums.LedgerEntryType | null | undefined;
  paymentRail?: $Enums.PaymentRail | null;
}): $Enums.LedgerEntryType {
  return params.settlementEntryType === $Enums.LedgerEntryType.USER_DEPOSIT ||
    params.paymentRail === $Enums.PaymentRail.CARD
    ? $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL
    : $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
}
