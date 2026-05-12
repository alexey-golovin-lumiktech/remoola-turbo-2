import { createHash } from 'crypto';

import { $Enums } from '@remoola/database-2';

export type PaymentReversalKind = `REFUND` | `CHARGEBACK`;

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

export function getRequesterReversalEntryType(params: {
  settlementEntryType: $Enums.LedgerEntryType | null | undefined;
  paymentRail?: $Enums.PaymentRail | null;
}): $Enums.LedgerEntryType {
  return params.settlementEntryType === $Enums.LedgerEntryType.USER_DEPOSIT ||
    params.paymentRail === $Enums.PaymentRail.CARD
    ? $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL
    : $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
}

export function buildPaymentReversalIdempotencyKey(payload: {
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
