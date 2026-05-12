import { createHash } from 'crypto';

import { $Enums } from '@remoola/database-2';

export type PaymentReversalKind = `REFUND` | `CHARGEBACK`;

export type StrictReversalAmountResolution =
  | {
      ok: true;
      finalAmount: number;
      remainingBefore: number;
    }
  | {
      ok: false;
      reason: `ALREADY_FULLY_REVERSED` | `EXCEEDS_REMAINING_BALANCE`;
      remainingBefore: number;
    };

export function getEffectiveLedgerStatus(entry: {
  status: $Enums.TransactionStatus;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
}): $Enums.TransactionStatus {
  return entry.outcomes?.[0]?.status ?? entry.status;
}

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
    amount: number | string | { toString(): string };
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }>,
): number {
  return reversalEntries.reduce((sum, entry) => {
    const effectiveStatus = getEffectiveLedgerStatus(entry);
    if (
      effectiveStatus !== $Enums.TransactionStatus.COMPLETED &&
      effectiveStatus !== $Enums.TransactionStatus.PENDING
    ) {
      return sum;
    }
    const amount = Number(entry.amount);
    return amount > 0 ? sum + amount : sum;
  }, 0);
}

export function resolveStrictReversalAmount(params: {
  requestAmount: number;
  alreadyReversed: number;
  requestedAmount?: number;
}): StrictReversalAmountResolution {
  const remainingBefore = params.requestAmount - params.alreadyReversed;
  if (remainingBefore <= 0) {
    return { ok: false, reason: `ALREADY_FULLY_REVERSED`, remainingBefore };
  }

  const finalAmount = params.requestedAmount ?? remainingBefore;
  if (finalAmount > remainingBefore) {
    return { ok: false, reason: `EXCEEDS_REMAINING_BALANCE`, remainingBefore };
  }

  return { ok: true, finalAmount, remainingBefore };
}

export function capExternalReversalAmount(params: {
  requestAmount: number;
  alreadyReversed: number;
  externalAmount: number;
}) {
  const remainingBefore = params.requestAmount - params.alreadyReversed;
  return {
    finalAmount: Math.min(params.externalAmount, remainingBefore),
    remainingBefore,
  };
}

export function buildAdminPaymentReversalIdempotencyKey(payload: {
  paymentRequestId: string;
  kind: PaymentReversalKind;
  amount: number;
  reason?: string | null;
}) {
  const normalized = JSON.stringify({
    ...payload,
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
