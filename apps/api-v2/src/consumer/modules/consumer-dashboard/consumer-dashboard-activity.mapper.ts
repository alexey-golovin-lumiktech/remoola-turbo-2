import { $Enums } from '@remoola/database-2';

import { type DashboardActivityLedgerRow } from './consumer-dashboard.query';
import { type ActivityItem } from './dtos/dashboard-data.dto';
import { parseLedgerMetadata } from '../../../shared/json-metadata.utils';
import { getEffectiveLedgerStatusOrNull } from '../../../shared/transaction-status.utils';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';

function normalizeDashboardActivityType(
  type: $Enums.LedgerEntryType,
  paymentRequestId: string | null | undefined,
): $Enums.LedgerEntryType {
  if (!paymentRequestId) return type;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  return type;
}

export function formatDashboardStatus(status: $Enums.TransactionStatus | null | undefined): string {
  const normalizedStatus = status ? normalizeConsumerFacingTransactionStatus(status) : status;
  switch (normalizedStatus) {
    case $Enums.TransactionStatus.COMPLETED:
      return `Completed`;
    case $Enums.TransactionStatus.PENDING:
      return `Pending`;
    case $Enums.TransactionStatus.WAITING:
      return `Waiting for confirmation`;
    case $Enums.TransactionStatus.DENIED:
      return `Denied`;
    case $Enums.TransactionStatus.UNCOLLECTIBLE:
      return `Failed to collect`;
    case $Enums.TransactionStatus.DRAFT:
      return `Draft`;
    default:
      return `Status updated`;
  }
}

function formatDashboardAmount(amount: number, currencyCode: $Enums.CurrencyCode): string {
  return `${Math.abs(amount).toFixed(2)} ${currencyCode}`;
}

function formatDashboardRail(rail: $Enums.PaymentRail | null | undefined): string | null {
  if (!rail) return null;
  if ([`CARD`, `CARD_3DS`, `CARD_TOKENIZED`].includes(rail)) {
    return `via card`;
  }
  if ([`BANK_TRANSFER`, `SEPA_TRANSFER`, `SEPA_INSTANT`, `SWIFT_TRANSFER`, `ACH`, `WIRE`].includes(rail)) {
    return `via bank transfer`;
  }
  return null;
}

function buildActivityDescription(parts: Array<string | null | undefined>): string | undefined {
  const value = parts.filter((part): part is string => Boolean(part && part.trim())).join(` • `);
  return value || undefined;
}

export function getDashboardPaymentMethodIds(rows: DashboardActivityLedgerRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => parseLedgerMetadata(row.metadata).paymentMethodId)
        .filter((paymentMethodId): paymentMethodId is string => Boolean(paymentMethodId)),
    ),
  );
}

export function mapFinancialActivityItem(
  row: DashboardActivityLedgerRow,
  paymentMethodLabelById: Map<string, string>,
): ActivityItem | null {
  const metadata = parseLedgerMetadata(row.metadata);
  const normalizedType = normalizeDashboardActivityType(row.type, row.paymentRequestId);
  const amount = Number(row.amount);
  const status = getEffectiveLedgerStatusOrNull(row) ?? row.status;
  const statusLabel = formatDashboardStatus(status);
  const rail = metadata.rail ?? row.paymentRequest?.paymentRail ?? null;
  const paymentMethodLabel = metadata.paymentMethodId
    ? (paymentMethodLabelById.get(metadata.paymentMethodId) ?? null)
    : null;

  switch (normalizedType) {
    case $Enums.LedgerEntryType.USER_PAYMENT:
      return {
        id: row.ledgerId,
        label: amount >= 0 ? `Payment received` : `Payment sent`,
        description: buildActivityDescription([
          statusLabel,
          formatDashboardAmount(amount, row.currencyCode),
          formatDashboardRail(rail),
        ]),
        createdAt: row.createdAt.toISOString(),
        kind: amount >= 0 ? `payment_received` : `payment_sent`,
      };
    case $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL:
      return {
        id: row.ledgerId,
        label: `Payment reversal`,
        description: buildActivityDescription([statusLabel, formatDashboardAmount(amount, row.currencyCode)]),
        createdAt: row.createdAt.toISOString(),
        kind: `payment_reversal`,
      };
    case $Enums.LedgerEntryType.USER_PAYOUT:
      return {
        id: row.ledgerId,
        label: `Withdrawal`,
        description: buildActivityDescription([
          statusLabel,
          formatDashboardAmount(amount, row.currencyCode),
          paymentMethodLabel ? `to ${paymentMethodLabel}` : formatDashboardRail(rail),
        ]),
        createdAt: row.createdAt.toISOString(),
        kind: `withdrawal`,
      };
    case $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL:
      return {
        id: row.ledgerId,
        label: `Withdrawal reversal`,
        description: buildActivityDescription([statusLabel, formatDashboardAmount(amount, row.currencyCode)]),
        createdAt: row.createdAt.toISOString(),
        kind: `withdrawal_reversal`,
      };
    case $Enums.LedgerEntryType.CURRENCY_EXCHANGE:
      return {
        id: row.ledgerId,
        label: metadata.from && metadata.to ? `Exchange ${metadata.from} to ${metadata.to}` : `Currency exchange`,
        description: buildActivityDescription([statusLabel, formatDashboardAmount(amount, row.currencyCode)]),
        createdAt: row.createdAt.toISOString(),
        kind: `currency_exchange`,
      };
    default:
      return null;
  }
}
