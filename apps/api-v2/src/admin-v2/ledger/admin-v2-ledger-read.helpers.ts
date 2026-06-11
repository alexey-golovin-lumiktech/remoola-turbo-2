import { type $Enums, type Prisma } from '@remoola/database-2';

import {
  type AdminV2LedgerCaseRecord,
  type AdminV2LedgerDisputeRow,
  type AdminV2LedgerListItemRecord,
} from './admin-v2-ledger.query';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;

export type AmountSignFilter = `positive` | `negative` | `zero`;

type LedgerRailSource = {
  metadata?: Prisma.JsonValue | null;
  paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
};

export function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

export function normalizeSearch(q?: string): string | undefined {
  const search = q?.trim();
  return search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

export function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

export function normalizeAmountSign(value: string | undefined): AmountSignFilter | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === `positive` || normalized === `negative` || normalized === `zero` ? normalized : undefined;
}

export function parseLedgerMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
}

export function deriveLedgerPaymentRail(entry: LedgerRailSource): $Enums.PaymentRail | null {
  const metadata = parseLedgerMetadata(entry.metadata);
  return (metadata.rail as $Enums.PaymentRail | undefined) ?? entry.paymentRequest?.paymentRail ?? null;
}

export function mapLedgerListItem(entry: AdminV2LedgerListItemRecord) {
  const effectiveStatus = getEffectiveLedgerStatus(entry);

  return {
    id: entry.id,
    ledgerId: entry.ledgerId,
    type: entry.type,
    amount: entry.amount.toString(),
    currencyCode: entry.currencyCode,
    persistedStatus: entry.status,
    effectiveStatus,
    paymentRail: deriveLedgerPaymentRail(entry),
    consumerId: entry.consumerId,
    consumerEmail: entry.consumer?.email ?? null,
    paymentRequestId: entry.paymentRequestId,
    paymentRequestStatus: entry.paymentRequest?.status ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    disputeCount: entry.disputes?.length ?? 0,
    staleWarning: effectiveStatus !== entry.status,
    dataFreshnessClass: `exact`,
  };
}

export function mapLedgerEntryCase<TAssignment>(ledgerCase: AdminV2LedgerCaseRecord, assignment: TAssignment) {
  const { entry, relatedEntries, auditContext } = ledgerCase;
  const effectiveStatus = getEffectiveLedgerStatus(entry);

  return {
    id: entry.id,
    core: {
      id: entry.id,
      ledgerId: entry.ledgerId,
      type: entry.type,
      amount: entry.amount.toString(),
      currencyCode: entry.currencyCode,
      persistedStatus: entry.status,
      effectiveStatus,
      paymentRail: deriveLedgerPaymentRail(entry),
      feesType: entry.feesType,
      feesAmount: entry.feesAmount?.toString() ?? null,
      stripeId: entry.stripeId,
      idempotencyKey: entry.idempotencyKey,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
    consumer: {
      id: entry.consumerId,
      email: entry.consumer?.email ?? null,
    },
    paymentRequest:
      entry.paymentRequest == null
        ? null
        : {
            id: entry.paymentRequest.id,
            amount: entry.paymentRequest.amount.toString(),
            currencyCode: entry.paymentRequest.currencyCode,
            status: entry.paymentRequest.status,
            paymentRail: entry.paymentRequest.paymentRail,
            payerId: entry.paymentRequest.payerId,
            payerEmail: entry.paymentRequest.payer?.email ?? null,
            requesterId: entry.paymentRequest.requesterId,
            requesterEmail: entry.paymentRequest.requester?.email ?? null,
          },
    metadata: parseLedgerMetadata(entry.metadata),
    outcomes: entry.outcomes.map((outcome) => ({
      id: outcome.id,
      status: outcome.status,
      source: outcome.source,
      externalId: outcome.externalId,
      createdAt: outcome.createdAt,
    })),
    disputes: entry.disputes.map((dispute) => ({
      id: dispute.id,
      stripeDisputeId: dispute.stripeDisputeId,
      metadata: parseLedgerMetadata(dispute.metadata),
      createdAt: dispute.createdAt,
    })),
    relatedEntries: relatedEntries.map((item) => ({
      id: item.id,
      ledgerId: item.ledgerId,
      type: item.type,
      amount: item.amount.toString(),
      currencyCode: item.currencyCode,
      effectiveStatus: getEffectiveLedgerStatus(item),
      createdAt: item.createdAt,
    })),
    auditContext: auditContext.map((row) => ({
      id: row.id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      adminEmail: row.admin?.email ?? null,
      createdAt: row.createdAt,
    })),
    assignment,
    staleWarning: effectiveStatus !== entry.status,
    dataFreshnessClass: `exact`,
  };
}

export function mapLedgerDisputeItem(row: AdminV2LedgerDisputeRow) {
  const metadata = parseLedgerMetadata(row.metadata);

  return {
    id: row.id,
    stripeDisputeId: row.stripeDisputeId,
    disputeStatus:
      typeof metadata.status === `string`
        ? metadata.status
        : typeof metadata.disputeStatus === `string`
          ? metadata.disputeStatus
          : null,
    reason: typeof metadata.reason === `string` ? metadata.reason : null,
    amountMinor: typeof metadata.amount === `number` ? metadata.amount : null,
    updatedAt: typeof metadata.updatedAt === `string` ? metadata.updatedAt : null,
    createdAt: row.createdAt,
    metadata,
    ledgerEntry: {
      id: row.ledgerEntry.id,
      ledgerId: row.ledgerEntry.ledgerId,
      paymentRequestId: row.ledgerEntry.paymentRequestId,
      consumerId: row.ledgerEntry.consumerId,
      type: row.ledgerEntry.type,
      amount: row.ledgerEntry.amount.toString(),
      currencyCode: row.ledgerEntry.currencyCode,
      paymentRail: row.ledgerEntry.paymentRequest?.paymentRail ?? null,
    },
    dataFreshnessClass: `append-only-log`,
  };
}
