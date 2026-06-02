import { $Enums } from '@remoola/database-2';

import { getEffectivePaymentRequestStatus as getEffectiveStatus } from '../../../shared/transaction-status.utils';

type DashboardPaymentRequestLedgerOutcomeStatus = {
  status: $Enums.TransactionStatus;
};

type DashboardPaymentRequestLedgerOutcomeTimestamp = {
  createdAt: Date;
};

type DashboardPaymentRequestLedgerStatus = {
  status: $Enums.TransactionStatus;
  outcomes?: DashboardPaymentRequestLedgerOutcomeStatus[];
};

type DashboardPaymentRequestLedgerActivity = {
  createdAt: Date;
  outcomes?: DashboardPaymentRequestLedgerOutcomeTimestamp[];
};

export type DashboardPaymentRequestStatusLike = {
  status: $Enums.TransactionStatus;
  ledgerEntries?: DashboardPaymentRequestLedgerStatus[];
};

export type DashboardPaymentRequestActivityLike = {
  updatedAt: Date;
  ledgerEntries?: DashboardPaymentRequestLedgerActivity[];
};

export function getDashboardPaymentRequestEffectiveStatus(
  paymentRequest: DashboardPaymentRequestStatusLike | null | undefined,
): $Enums.TransactionStatus | null {
  if (!paymentRequest) return null;
  return getEffectiveStatus(paymentRequest.status, paymentRequest.ledgerEntries?.[0]);
}

export function isActiveDashboardPaymentRequest(
  paymentRequest: DashboardPaymentRequestStatusLike | null | undefined,
): boolean {
  return getDashboardPaymentRequestEffectiveStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED;
}

export function getPendingDashboardRequestLastActivityAt(
  paymentRequest: DashboardPaymentRequestActivityLike | null | undefined,
): Date | null {
  if (!paymentRequest) return null;
  const latestConsumerEntry = paymentRequest.ledgerEntries?.[0];
  const latestOutcomeAt = latestConsumerEntry?.outcomes?.[0]?.createdAt ?? null;
  return latestOutcomeAt ?? latestConsumerEntry?.createdAt ?? paymentRequest.updatedAt;
}
