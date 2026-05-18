import { Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { deriveVersion } from '../admin-v2-version-utils';
import { AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import { PayoutHighValuePolicyService } from './payout-high-value-policy.service';
import {
  PayoutPaymentMethodResolverService,
  type PaymentMethodSummaryRow,
} from './payout-payment-method-resolver.service';
import {
  derivePayoutStatus,
  getEffectiveLedgerStatus,
  getEscalationBlockReason,
  getOutcomeAgeHours,
  PAYOUT_STUCK_THRESHOLD_HOURS,
} from './payout-status-deriver';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const PAYOUT_TYPES = [$Enums.LedgerEntryType.USER_PAYOUT, $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL] as const;

type PayoutListRow = {
  id: string;
  ledgerId: string;
  type: $Enums.LedgerEntryType;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal;
  stripeId: string | null;
  metadata: Prisma.JsonValue | null;
  consumerId: string;
  paymentRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
  consumer?: { email: string | null } | null;
  payoutEscalation?: { id: string } | null;
  outcomes?: Array<{
    id: string;
    status: $Enums.TransactionStatus;
    externalId: string | null;
    createdAt: Date;
  }>;
};

type PayoutEscalationState = {
  id: string;
  reason: string | null;
  confirmed: boolean;
  createdAt: string;
  escalatedBy: {
    id: string;
    email: string | null;
  };
};

function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function buildCreatedAtCursorWhere(cursor: { createdAt: Date; id: string } | null): Prisma.LedgerEntryModelWhereInput {
  if (!cursor) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
      },
    ],
  };
}

@Injectable()
export class AdminV2PayoutQueryService {
  constructor(
    private readonly assignmentsService: AdminV2AssignmentsService,
    private readonly payoutsQuery: AdminV2PayoutsRepository,
    private readonly highValuePolicy: PayoutHighValuePolicyService,
    private readonly paymentMethodResolver: PayoutPaymentMethodResolverService,
  ) {}

  async listPayouts(params?: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const highValueConfig = this.highValuePolicy.getConfig();

    const rows = await this.payoutsQuery.listPayoutRows(
      {
        deletedAt: null,
        type: { in: [...PAYOUT_TYPES] },
        ...buildCreatedAtCursorWhere(cursor),
      },
      limit + 1,
    );

    const visibleRows = rows.slice(0, limit) as PayoutListRow[];
    const paymentMethodsById = await this.paymentMethodResolver.getPaymentMethodsById(visibleRows);
    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `payout`,
      visibleRows.map((row) => row.id),
    );
    const next = rows[limit];

    return {
      generatedAt: new Date(),
      posture: {
        kind: `threshold_derived_follow_up_queue`,
        wording: [
          `Ledger-based payout queue with a single action path:`,
          `failed or stuck payouts may be escalated, and all other payout statuses stay visible for review.`,
        ].join(` `),
      },
      stuckPolicy: {
        thresholdHours: PAYOUT_STUCK_THRESHOLD_HOURS,
        breachCondition: `the latest payout outcome is still pending-like after the current threshold`,
        escalationTarget: `manual review with payout_escalate available only for failed or stuck payouts`,
        expectedOperatorReaction: [
          `open the payout case, inspect the outcome timeline, confirm destination and payment context`,
          `and escalate only if the payout is failed or stuck`,
        ].join(` `),
        automationStatus: `This list is detected automatically; payout execution writes remain disabled`,
      },
      highValuePolicy: highValueConfig.policy,
      items: visibleRows.map((row) => this.mapPayoutListItem(row, paymentMethodsById, assigneeMap.get(row.id) ?? null)),
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }

  async getPayoutCase(payoutId: string) {
    const highValueConfig = this.highValuePolicy.getConfig();
    const entry = await this.payoutsQuery.findPayoutCaseEntry(payoutId);

    if (!entry || !PAYOUT_TYPES.includes(entry.type as (typeof PAYOUT_TYPES)[number])) {
      throw new NotFoundException(`Payout not found`);
    }

    const paymentMethodsById = await this.paymentMethodResolver.getPaymentMethodsById([entry]);
    const relatedEntries = await this.payoutsQuery.findRelatedEntries(entry.ledgerId);

    const [auditContext, assignment] = await Promise.all([
      this.payoutsQuery.findAuditContext(
        [entry.id, entry.paymentRequestId].filter((resourceId): resourceId is string => Boolean(resourceId)),
      ),
      this.assignmentsService.getAssignmentContextForResource(`payout`, entry.id),
    ]);

    const effectiveStatus = getEffectiveLedgerStatus(entry);
    const derivedStatus = derivePayoutStatus(entry);
    const escalationBlockReason = getEscalationBlockReason({
      derivedStatus,
      escalation: entry.payoutEscalation,
    });

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
        derivedStatus,
        externalReference: this.getExternalReference(entry),
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
              payerEmail: entry.paymentRequest.payer?.email ?? entry.paymentRequest.payerEmail ?? null,
              requesterId: entry.paymentRequest.requesterId,
              requesterEmail: entry.paymentRequest.requester?.email ?? entry.paymentRequest.requesterEmail ?? null,
            },
      metadata: this.parseMetadata(entry.metadata),
      outcomes: entry.outcomes.map((outcome) => ({
        id: outcome.id,
        status: outcome.status,
        source: outcome.source,
        externalId: outcome.externalId,
        createdAt: outcome.createdAt,
      })),
      relatedEntries: relatedEntries.map((item) => ({
        id: item.id,
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
      outcomeAgeHours: getOutcomeAgeHours(entry),
      slaBreachDetected: derivedStatus === `stuck`,
      stuckPolicy: {
        thresholdHours: PAYOUT_STUCK_THRESHOLD_HOURS,
        breachCondition: `the latest payout outcome is still pending-like after the current threshold`,
        escalationTarget: `manual review with payout_escalate available only for failed or stuck payouts`,
        expectedOperatorReaction: [
          `review the payout case, confirm destination linkage`,
          `and use payout_escalate only when the payout is failed or stuck`,
        ].join(` `),
        automationStatus: `This list is detected automatically; payout execution writes remain disabled`,
      },
      version: deriveVersion(entry.updatedAt),
      highValuePolicy: highValueConfig.policy,
      highValue: this.highValuePolicy.assess(entry),
      payoutEscalation: this.mapEscalationState(entry.payoutEscalation),
      actionControls: {
        canEscalate: escalationBlockReason == null,
        allowedActions: escalationBlockReason == null ? [`payout_escalate`] : [],
        escalateBlockedReason: escalationBlockReason,
      },
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
      ...this.paymentMethodResolver.resolveDestination(entry, paymentMethodsById),
    };
  }

  private parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
  }

  private getExternalReference(entry: {
    stripeId: string | null;
    metadata?: Prisma.JsonValue | null;
    outcomes?: Array<{ externalId: string | null }>;
  }): string | null {
    const metadata = this.parseMetadata(entry.metadata);
    if (typeof metadata.payoutReference === `string` && metadata.payoutReference.trim()) {
      return metadata.payoutReference.trim();
    }
    const outcomeExternalId = entry.outcomes
      ?.find((outcome) => typeof outcome.externalId === `string`)
      ?.externalId?.trim();
    if (outcomeExternalId) {
      return outcomeExternalId;
    }
    return entry.stripeId?.trim() || null;
  }

  private mapEscalationState(
    escalation:
      | {
          id: string;
          reason: string | null;
          confirmed: boolean;
          createdAt: Date;
          escalatedByAdmin: {
            id: string;
            email: string | null;
          };
        }
      | null
      | undefined,
  ): PayoutEscalationState | null {
    if (!escalation) {
      return null;
    }

    return {
      id: escalation.id,
      reason: escalation.reason,
      confirmed: escalation.confirmed,
      createdAt: escalation.createdAt.toISOString(),
      escalatedBy: {
        id: escalation.escalatedByAdmin.id,
        email: escalation.escalatedByAdmin.email,
      },
    };
  }

  private mapPayoutListItem(
    entry: PayoutListRow,
    paymentMethodsById: Map<string, PaymentMethodSummaryRow>,
    assignedTo: AdminRef | null = null,
  ) {
    const effectiveStatus = getEffectiveLedgerStatus(entry);
    const derivedStatus = derivePayoutStatus(entry);
    const outcomeAgeHours = getOutcomeAgeHours(entry);
    const highValue = this.highValuePolicy.assess(entry);

    return {
      id: entry.id,
      ledgerId: entry.ledgerId,
      type: entry.type,
      amount: entry.amount.toString(),
      currencyCode: entry.currencyCode,
      persistedStatus: entry.status,
      effectiveStatus,
      derivedStatus,
      externalReference: this.getExternalReference(entry),
      consumer: {
        id: entry.consumerId,
        email: entry.consumer?.email ?? null,
      },
      paymentRequestId: entry.paymentRequestId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
      outcomeAgeHours,
      slaBreachDetected: derivedStatus === `stuck`,
      highValue,
      hasActiveEscalation: Boolean(entry.payoutEscalation?.id),
      ...this.paymentMethodResolver.resolveDestination(entry, paymentMethodsById),
      assignedTo,
    };
  }
}
