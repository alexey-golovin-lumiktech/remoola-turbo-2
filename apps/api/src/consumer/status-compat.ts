import { $Enums } from '@remoola/database-2';

const LEGACY_WAITING_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
] as const;

export function normalizeConsumerFacingTransactionStatus(status: $Enums.TransactionStatus): $Enums.TransactionStatus {
  return status === $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL ? $Enums.TransactionStatus.WAITING : status;
}

export function buildLegacyConsumerStatusFilter(
  status?: string,
): $Enums.TransactionStatus | { in: $Enums.TransactionStatus[] } | undefined {
  if (!status) {
    return undefined;
  }

  if (status === $Enums.TransactionStatus.WAITING) {
    return { in: [...LEGACY_WAITING_STATUSES] };
  }

  return status as $Enums.TransactionStatus;
}
