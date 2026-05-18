import { type $Enums } from '@remoola/database-2';

export type LedgerStatusCarrier = {
  status: $Enums.TransactionStatus;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
};

export function getEffectiveLedgerStatus(entry: LedgerStatusCarrier): $Enums.TransactionStatus {
  return entry.outcomes?.[0]?.status ?? entry.status;
}

export function getEffectiveLedgerStatusOrNull(
  entry: LedgerStatusCarrier | null | undefined,
): $Enums.TransactionStatus | null {
  if (!entry) {
    return null;
  }
  return getEffectiveLedgerStatus(entry);
}

export function getEffectivePaymentRequestStatus(
  paymentRequestStatus: $Enums.TransactionStatus,
  entry: LedgerStatusCarrier | null | undefined,
): $Enums.TransactionStatus {
  return getEffectiveLedgerStatusOrNull(entry) ?? paymentRequestStatus;
}
