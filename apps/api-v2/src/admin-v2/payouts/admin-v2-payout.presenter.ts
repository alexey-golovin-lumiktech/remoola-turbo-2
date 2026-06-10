import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

import { deriveVersion } from '../admin-v2-version-utils';
import { type AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import { type PayoutPaymentMethodResolverService } from './payout-payment-method-resolver.service';
import {
  derivePayoutStatus,
  getEffectiveLedgerStatus,
  getEscalationBlockReason,
  getOutcomeAgeHours,
  PAYOUT_STUCK_THRESHOLD_HOURS,
} from './payout-status-deriver';
import { type AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

export type PayoutListRow = Awaited<ReturnType<AdminV2PayoutsRepository[`listPayoutRows`]>>[number];
type PayoutCaseEntry = NonNullable<Awaited<ReturnType<AdminV2PayoutsRepository[`findPayoutCaseEntry`]>>>;
type PayoutRelatedEntry = Awaited<ReturnType<AdminV2PayoutsRepository[`findRelatedEntries`]>>[number];
type PayoutAuditContextRow = Awaited<ReturnType<AdminV2PayoutsRepository[`findAuditContext`]>>[number];
type PayoutAssignmentContext = Awaited<ReturnType<AdminV2AssignmentsService[`getAssignmentContextForResource`]>>;
type DestinationOverlay = ReturnType<PayoutPaymentMethodResolverService[`resolveDestination`]>;

type HighValuePolicyView = {
  availability: string;
  source: string;
  wording: string;
  configuredThresholds: Array<{ currencyCode: string; amount: string }>;
};

type HighValueAssessment = {
  eligibility: string;
  thresholdAmount: string | null;
  thresholdCurrency: string | null;
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

function parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
}

function getExternalReference(entry: {
  stripeId: string | null;
  metadata?: Prisma.JsonValue | null;
  outcomes?: Array<{ externalId: string | null }>;
}): string | null {
  const metadata = parseMetadata(entry.metadata);
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

function mapPayoutEscalationState(
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

export function mapPayoutListItem(params: {
  entry: PayoutListRow;
  assignedTo?: AdminRef | null;
  highValue: HighValueAssessment;
  destination: DestinationOverlay;
}) {
  const { entry, assignedTo = null, highValue, destination } = params;
  const effectiveStatus = getEffectiveLedgerStatus(entry);
  const derivedStatus = derivePayoutStatus(entry);

  return {
    id: entry.id,
    ledgerId: entry.ledgerId,
    type: entry.type,
    amount: entry.amount.toString(),
    currencyCode: entry.currencyCode,
    persistedStatus: entry.status,
    effectiveStatus,
    derivedStatus,
    externalReference: getExternalReference(entry),
    consumer: {
      id: entry.consumerId,
      email: entry.consumer?.email ?? null,
    },
    paymentRequestId: entry.paymentRequestId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    staleWarning: effectiveStatus !== entry.status,
    dataFreshnessClass: `exact`,
    outcomeAgeHours: getOutcomeAgeHours(entry),
    slaBreachDetected: derivedStatus === `stuck`,
    highValue,
    hasActiveEscalation: Boolean(entry.payoutEscalation?.id),
    ...destination,
    assignedTo,
  };
}

export function mapPayoutCase(params: {
  entry: PayoutCaseEntry;
  relatedEntries: PayoutRelatedEntry[];
  auditContext: PayoutAuditContextRow[];
  assignment: PayoutAssignmentContext;
  highValuePolicy: HighValuePolicyView;
  highValue: HighValueAssessment;
  destination: DestinationOverlay;
}) {
  const { entry, relatedEntries, auditContext, assignment, highValuePolicy, highValue, destination } = params;
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
      externalReference: getExternalReference(entry),
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
    metadata: parseMetadata(entry.metadata),
    outcomes: entry.outcomes.map((outcome) => ({
      id: outcome.id,
      status: outcome.status,
      source: outcome.source,
      externalId: outcome.externalId,
      createdAt: outcome.createdAt,
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
    highValuePolicy,
    highValue,
    payoutEscalation: mapPayoutEscalationState(entry.payoutEscalation),
    actionControls: {
      canEscalate: escalationBlockReason == null,
      allowedActions: escalationBlockReason == null ? [`payout_escalate`] : [],
      escalateBlockedReason: escalationBlockReason,
    },
    staleWarning: effectiveStatus !== entry.status,
    dataFreshnessClass: `exact`,
    ...destination,
  };
}
