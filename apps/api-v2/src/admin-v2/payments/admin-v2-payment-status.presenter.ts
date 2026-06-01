import { $Enums, type Prisma } from '@remoola/database-2';

import { parseLedgerMetadata } from '../../shared/json-metadata.utils';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

export type PaymentStatusPolicyInput =
  | {
      status: $Enums.TransactionStatus;
      ledgerEntries?: Array<{
        status: $Enums.TransactionStatus;
        createdAt: Date;
        type: $Enums.LedgerEntryType;
        outcomes?: Array<{ status: $Enums.TransactionStatus }>;
      }>;
    }
  | null
  | undefined;

export type PaymentRailPolicyInput =
  | {
      paymentRail?: $Enums.PaymentRail | null;
      ledgerEntries?: Array<{
        type: $Enums.LedgerEntryType;
        metadata?: Prisma.JsonValue | null;
      }>;
    }
  | null
  | undefined;

export function getLatestSettlementEntry(paymentRequest: PaymentStatusPolicyInput) {
  return [...(paymentRequest?.ledgerEntries ?? [])]
    .filter((entry) =>
      PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES.includes(
        entry.type as (typeof PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES)[number],
      ),
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
}

export function getEffectivePaymentStatus(paymentRequest: PaymentStatusPolicyInput): $Enums.TransactionStatus | null {
  if (!paymentRequest) {
    return null;
  }

  const latestEntry = getLatestSettlementEntry(paymentRequest);
  return latestEntry ? getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
}

export function derivePaymentRail(paymentRequest: PaymentRailPolicyInput): $Enums.PaymentRail | null {
  if (!paymentRequest) {
    return null;
  }

  if (paymentRequest.paymentRail) {
    return paymentRequest.paymentRail;
  }

  for (const entry of paymentRequest.ledgerEntries ?? []) {
    const metadata = parseLedgerMetadata(entry.metadata);
    if (metadata.rail) {
      return metadata.rail;
    }
  }

  return null;
}
