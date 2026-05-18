import { $Enums } from '@remoola/database-2';

import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

export const PAYOUT_STUCK_THRESHOLD_HOURS = 24;

const PENDING_LIKE_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;

export type PayoutDerivedStatus = `pending` | `processing` | `completed` | `failed` | `stuck` | `reversed`;

type PayoutOutcomeTimestampInput = {
  createdAt: Date;
  outcomes?: Array<{ createdAt: Date }>;
};

type PayoutStatusInput = {
  type: $Enums.LedgerEntryType;
  status: $Enums.TransactionStatus;
  createdAt: Date;
  outcomes?: Array<{ status: $Enums.TransactionStatus; createdAt: Date }>;
};

type PayoutEscalationBlockParams = {
  derivedStatus: PayoutDerivedStatus;
  escalation?: { id: string } | null;
};

export { getEffectiveLedgerStatus };

export function getLatestOutcomeTimestamp(entry: PayoutOutcomeTimestampInput): Date {
  return entry.outcomes?.[0]?.createdAt ?? entry.createdAt;
}

export function getOutcomeAgeHours(entry: PayoutOutcomeTimestampInput, now = new Date()): number {
  return Math.max(0, (now.getTime() - getLatestOutcomeTimestamp(entry).getTime()) / (60 * 60 * 1000));
}

export function derivePayoutStatus(entry: PayoutStatusInput, now = new Date()): PayoutDerivedStatus {
  if (entry.type === $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL) {
    return `reversed`;
  }

  const effectiveStatus = getEffectiveLedgerStatus(entry);
  if (effectiveStatus === $Enums.TransactionStatus.COMPLETED) {
    return `completed`;
  }
  if (effectiveStatus === $Enums.TransactionStatus.DENIED) {
    return `failed`;
  }

  const outcomeAgeHours = getOutcomeAgeHours(entry, now);
  if (PENDING_LIKE_STATUSES.includes(effectiveStatus as (typeof PENDING_LIKE_STATUSES)[number])) {
    if (outcomeAgeHours >= PAYOUT_STUCK_THRESHOLD_HOURS) {
      return `stuck`;
    }
    if (effectiveStatus === $Enums.TransactionStatus.WAITING) {
      return `pending`;
    }
    return `processing`;
  }

  return `processing`;
}

export function getEscalationBlockReason(params: PayoutEscalationBlockParams): string | null {
  if (params.escalation?.id) {
    return `Payout already has an active escalation marker`;
  }

  if (params.derivedStatus !== `failed` && params.derivedStatus !== `stuck`) {
    return `Only failed or stuck payouts can receive an escalation marker in the current operator slice`;
  }

  return null;
}
