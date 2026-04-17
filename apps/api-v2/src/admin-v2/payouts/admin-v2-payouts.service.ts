import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { envs } from '../../envs';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const PAYOUT_STUCK_THRESHOLD_HOURS = 24;
const REASON_MAX_LENGTH = 500;
const PAYOUT_TYPES = [$Enums.LedgerEntryType.USER_PAYOUT, $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL] as const;
const PENDING_LIKE_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;
const PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE = `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`;

type PayoutDerivedStatus = `pending` | `processing` | `completed` | `failed` | `stuck` | `reversed`;
type PayoutHighValueEligibility = `high-value` | `below-threshold` | `not-configured`;
type PayoutHighValuePolicyAvailability = `configured` | `partially-configured` | `unconfigured`;
type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

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

type PaymentMethodSummaryRow = {
  id: string;
  consumerId: string;
  type: $Enums.PaymentMethodType;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
  deletedAt: Date | null;
};

type LockedPayoutRow = {
  id: string;
  type: $Enums.LedgerEntryType;
  status: $Enums.TransactionStatus;
  consumer_id: string;
  payment_request_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

type PayoutHighValuePolicy = {
  availability: PayoutHighValuePolicyAvailability;
  source: string;
  wording: string;
  configuredThresholds: Array<{
    currencyCode: $Enums.CurrencyCode;
    amount: string;
  }>;
};

type PayoutHighValueAssessment = {
  eligibility: PayoutHighValueEligibility;
  thresholdAmount: string | null;
  thresholdCurrency: $Enums.CurrencyCode;
};

type PayoutHighValueConfig = {
  policy: PayoutHighValuePolicy;
  thresholds: Map<$Enums.CurrencyCode, Prisma.Decimal>;
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

function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
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

function buildPayoutStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Payout case has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

@Injectable()
export class AdminV2PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
  ) {}

  private parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
  }

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getLatestOutcomeTimestamp(entry: { createdAt: Date; outcomes?: Array<{ createdAt: Date }> }): Date {
    return entry.outcomes?.[0]?.createdAt ?? entry.createdAt;
  }

  private getOutcomeAgeHours(entry: { createdAt: Date; outcomes?: Array<{ createdAt: Date }> }): number {
    return Math.max(0, (Date.now() - this.getLatestOutcomeTimestamp(entry).getTime()) / (60 * 60 * 1000));
  }

  private normalizeEscalationReason(reason: string | null | undefined) {
    const normalized = reason?.trim() || null;
    if (normalized && normalized.length > REASON_MAX_LENGTH) {
      throw new BadRequestException(`Escalation reason is too long`);
    }
    return normalized;
  }

  private derivePayoutStatus(entry: {
    type: $Enums.LedgerEntryType;
    status: $Enums.TransactionStatus;
    createdAt: Date;
    outcomes?: Array<{ status: $Enums.TransactionStatus; createdAt: Date }>;
  }): PayoutDerivedStatus {
    if (entry.type === $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL) {
      return `reversed`;
    }

    const effectiveStatus = this.getEffectiveLedgerStatus(entry);
    if (effectiveStatus === $Enums.TransactionStatus.COMPLETED) {
      return `completed`;
    }
    if (effectiveStatus === $Enums.TransactionStatus.DENIED) {
      return `failed`;
    }

    const outcomeAgeHours = this.getOutcomeAgeHours(entry);
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

  private getPaymentMethodId(metadata: Prisma.JsonValue | null | undefined): string | null {
    const parsed = this.parseMetadata(metadata);
    return typeof parsed.paymentMethodId === `string` && parsed.paymentMethodId.trim()
      ? parsed.paymentMethodId.trim()
      : null;
  }

  private getHighValueConfig(): PayoutHighValueConfig {
    const configuredThresholds: Array<{ currencyCode: $Enums.CurrencyCode; amount: string }> = [];
    const thresholds = new Map<$Enums.CurrencyCode, Prisma.Decimal>();
    const raw = envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS.trim();

    if (!raw) {
      return {
        thresholds,
        policy: {
          availability: `unconfigured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts stay queue-visible only when per-currency thresholds are configured.`,
            `The current runtime has no configured thresholds.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== `object` || Array.isArray(parsed)) {
        throw new Error(`Threshold config must be a JSON object`);
      }

      for (const [currencyCode, amount] of Object.entries(parsed)) {
        if (!Object.values($Enums.CurrencyCode).includes(currencyCode as $Enums.CurrencyCode)) {
          continue;
        }

        const decimalAmount = new Prisma.Decimal(String(amount));
        if (decimalAmount.lte(0)) {
          continue;
        }

        thresholds.set(currencyCode as $Enums.CurrencyCode, decimalAmount);
        configuredThresholds.push({
          currencyCode: currencyCode as $Enums.CurrencyCode,
          amount: decimalAmount.toString(),
        });
      }
    } catch {
      return {
        thresholds,
        policy: {
          availability: `partially-configured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts cannot be evaluated truthfully`,
            `because the current threshold config is invalid JSON.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    if (configuredThresholds.length === 0) {
      return {
        thresholds,
        policy: {
          availability: `partially-configured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts are not evaluable`,
            `because the configured threshold map does not contain valid positive per-currency amounts.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    return {
      thresholds,
      policy: {
        availability: `configured`,
        source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
        wording: [
          `High-value payouts are derived from configured per-currency thresholds.`,
          `Currencies without an explicit threshold remain non-evaluable.`,
        ].join(` `),
        configuredThresholds,
      },
    };
  }

  private assessHighValue(
    entry: { amount: Prisma.Decimal; currencyCode: $Enums.CurrencyCode },
    config: PayoutHighValueConfig,
  ): PayoutHighValueAssessment {
    const threshold = config.thresholds.get(entry.currencyCode);
    if (!threshold) {
      return {
        eligibility: `not-configured`,
        thresholdAmount: null,
        thresholdCurrency: entry.currencyCode,
      };
    }

    const absoluteAmount = new Prisma.Decimal(entry.amount.toString()).abs();
    return {
      eligibility: absoluteAmount.gte(threshold) ? `high-value` : `below-threshold`,
      thresholdAmount: threshold.toString(),
      thresholdCurrency: entry.currencyCode,
    };
  }

  private getEscalationBlockReason(params: {
    derivedStatus: PayoutDerivedStatus;
    escalation: { id: string } | null | undefined;
  }) {
    if (params.escalation?.id) {
      return `Payout already has an active escalation marker`;
    }

    if (params.derivedStatus !== `failed` && params.derivedStatus !== `stuck`) {
      return `Only failed or stuck payouts can be escalated in MVP-2`;
    }

    return null;
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

  private mapDestinationPaymentMethod(
    entry: { consumerId: string; metadata?: Prisma.JsonValue | null },
    paymentMethodsById: Map<string, PaymentMethodSummaryRow>,
  ) {
    const paymentMethodId = this.getPaymentMethodId(entry.metadata);
    if (!paymentMethodId) {
      return {
        destinationPaymentMethodSummary: null,
        destinationAvailability: `unavailable` as const,
        destinationLinkageSource: null,
      };
    }

    const paymentMethod = paymentMethodsById.get(paymentMethodId);
    if (!paymentMethod || paymentMethod.consumerId !== entry.consumerId) {
      return {
        destinationPaymentMethodSummary: null,
        destinationAvailability: `unavailable` as const,
        destinationLinkageSource: null,
      };
    }

    return {
      destinationPaymentMethodSummary: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        bankLast4: paymentMethod.bankLast4,
        deletedAt: paymentMethod.deletedAt?.toISOString() ?? null,
      },
      destinationAvailability: `linked` as const,
      destinationLinkageSource: `metadata.paymentMethodId` as const,
    };
  }

  private async fetchPaymentMethodsById(entries: Array<{ consumerId: string; metadata?: Prisma.JsonValue | null }>) {
    const paymentMethodIds = Array.from(
      new Set(
        entries.map((entry) => this.getPaymentMethodId(entry.metadata)).filter((id): id is string => Boolean(id)),
      ),
    );

    if (paymentMethodIds.length === 0) {
      return new Map<string, PaymentMethodSummaryRow>();
    }

    const paymentMethods = await this.prisma.paymentMethodModel.findMany({
      where: {
        id: { in: paymentMethodIds },
      },
      select: {
        id: true,
        consumerId: true,
        type: true,
        brand: true,
        last4: true,
        bankLast4: true,
        deletedAt: true,
      },
    });

    return new Map(paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod]));
  }

  private mapPayoutListItem(
    entry: PayoutListRow,
    paymentMethodsById: Map<string, PaymentMethodSummaryRow>,
    highValueConfig: PayoutHighValueConfig,
  ) {
    const effectiveStatus = this.getEffectiveLedgerStatus(entry);
    const derivedStatus = this.derivePayoutStatus(entry);
    const outcomeAgeHours = this.getOutcomeAgeHours(entry);
    const highValue = this.assessHighValue(entry, highValueConfig);

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
      ...this.mapDestinationPaymentMethod(entry, paymentMethodsById),
    };
  }

  async listPayouts(params?: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const highValueConfig = this.getHighValueConfig();

    const rows = await this.prisma.ledgerEntryModel.findMany({
      where: {
        deletedAt: null,
        type: { in: [...PAYOUT_TYPES] },
        ...buildCreatedAtCursorWhere(cursor),
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
      select: {
        id: true,
        ledgerId: true,
        type: true,
        currencyCode: true,
        status: true,
        amount: true,
        stripeId: true,
        metadata: true,
        consumerId: true,
        paymentRequestId: true,
        createdAt: true,
        updatedAt: true,
        consumer: {
          select: {
            email: true,
          },
        },
        payoutEscalation: {
          select: {
            id: true,
          },
        },
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: {
            id: true,
            status: true,
            externalId: true,
            createdAt: true,
          },
        },
      },
    });

    const visibleRows = rows.slice(0, limit) as PayoutListRow[];
    const paymentMethodsById = await this.fetchPaymentMethodsById(visibleRows);
    const next = rows[limit];

    return {
      generatedAt: new Date(),
      posture: {
        kind: `threshold_derived_follow_up_queue`,
        wording: [
          `Ledger-derived payout queue with a single regulated action path:`,
          `failed or stuck payouts may be escalated, and all other payout statuses remain investigation-only.`,
        ].join(` `),
      },
      stuckPolicy: {
        thresholdHours: PAYOUT_STUCK_THRESHOLD_HOURS,
        breachCondition: `latest pending-like payout outcome is older than the current threshold`,
        escalationTarget: `human review with payout_escalate available only for failed or stuck payouts`,
        expectedOperatorReaction: [
          `open payout case, inspect outcome timeline, verify destination/payment context`,
          `and escalate only if the payout is failed or stuck`,
        ].join(` `),
        automationStatus: `machine-detected queue only; payout execution writes remain disabled`,
      },
      highValuePolicy: highValueConfig.policy,
      items: visibleRows.map((row) => this.mapPayoutListItem(row, paymentMethodsById, highValueConfig)),
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }

  async getPayoutCase(payoutId: string) {
    const highValueConfig = this.getHighValueConfig();
    const entry = await this.prisma.ledgerEntryModel.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        ledgerId: true,
        type: true,
        currencyCode: true,
        status: true,
        amount: true,
        stripeId: true,
        metadata: true,
        consumerId: true,
        paymentRequestId: true,
        createdAt: true,
        updatedAt: true,
        consumer: {
          select: {
            email: true,
          },
        },
        payoutEscalation: {
          select: {
            id: true,
            reason: true,
            confirmed: true,
            createdAt: true,
            escalatedByAdmin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paymentRequest: {
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            payerId: true,
            payerEmail: true,
            requesterId: true,
            requesterEmail: true,
            payer: { select: { email: true } },
            requester: { select: { email: true } },
          },
        },
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
            status: true,
            source: true,
            externalId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!entry || !PAYOUT_TYPES.includes(entry.type as (typeof PAYOUT_TYPES)[number])) {
      throw new NotFoundException(`Payout not found`);
    }

    const paymentMethodsById = await this.fetchPaymentMethodsById([entry]);
    const relatedEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        ledgerId: entry.ledgerId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: `asc` }, { id: `asc` }],
      select: {
        id: true,
        type: true,
        amount: true,
        currencyCode: true,
        status: true,
        createdAt: true,
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: { status: true },
        },
      },
    });

    const auditContext = await this.prisma.adminActionAuditLogModel.findMany({
      where: {
        OR: [{ resourceId: entry.id }, ...(entry.paymentRequestId ? [{ resourceId: entry.paymentRequestId }] : [])],
      },
      include: {
        admin: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: 20,
    });

    const effectiveStatus = this.getEffectiveLedgerStatus(entry);
    const derivedStatus = this.derivePayoutStatus(entry);
    const escalationBlockReason = this.getEscalationBlockReason({
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
        effectiveStatus: this.getEffectiveLedgerStatus(item),
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
      outcomeAgeHours: this.getOutcomeAgeHours(entry),
      slaBreachDetected: derivedStatus === `stuck`,
      stuckPolicy: {
        thresholdHours: PAYOUT_STUCK_THRESHOLD_HOURS,
        breachCondition: `latest pending-like payout outcome is older than the current threshold`,
        escalationTarget: `human review with payout_escalate available only for failed or stuck payouts`,
        expectedOperatorReaction: [
          `review the payout case, verify destination linkage`,
          `and use payout_escalate only when the payout is failed or stuck`,
        ].join(` `),
        automationStatus: `machine-detected queue only; payout execution writes remain disabled`,
      },
      version: deriveVersion(entry.updatedAt),
      highValuePolicy: highValueConfig.policy,
      highValue: this.assessHighValue(entry, highValueConfig),
      payoutEscalation: this.mapEscalationState(entry.payoutEscalation),
      actionControls: {
        canEscalate: escalationBlockReason == null,
        allowedActions: escalationBlockReason == null ? [`payout_escalate`] : [],
        escalateBlockedReason: escalationBlockReason,
      },
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
      ...this.mapDestinationPaymentMethod(entry, paymentMethodsById),
    };
  }

  async escalatePayout(
    payoutId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number; reason?: string | null },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for payout escalation`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    const reason = this.normalizeEscalationReason(body.reason);

    return this.idempotency.execute({
      adminId,
      scope: `payout-escalate:${payoutId}`,
      key: meta.idempotencyKey,
      payload: {
        payoutId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async () => {
        const payout = await this.prisma.ledgerEntryModel.findUnique({
          where: { id: payoutId },
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            outcomes: {
              orderBy: [{ createdAt: `desc` }, { id: `desc` }],
              take: 1,
              select: {
                status: true,
                createdAt: true,
              },
            },
          },
        });

        if (!payout || !PAYOUT_TYPES.includes(payout.type as (typeof PAYOUT_TYPES)[number])) {
          throw new NotFoundException(`Payout not found`);
        }

        if (deriveVersion(payout.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildPayoutStaleVersionPayload(payout.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<LockedPayoutRow[]>(Prisma.sql`
            SELECT
              "id",
              "type",
              "status",
              "consumer_id",
              "payment_request_id",
              "created_at",
              "updated_at",
              "deleted_at"
            FROM "ledger_entry"
            WHERE "id" = ${payoutId}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked || !PAYOUT_TYPES.includes(locked.type as (typeof PAYOUT_TYPES)[number])) {
            throw new NotFoundException(`Payout not found`);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildPayoutStaleVersionPayload(locked.updated_at));
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Soft-deleted payouts remain investigation-only`);
          }

          const latestOutcome = await tx.ledgerEntryOutcomeModel.findFirst({
            where: {
              ledgerEntryId: locked.id,
            },
            orderBy: [{ createdAt: `desc` }, { id: `desc` }],
            select: {
              status: true,
              createdAt: true,
              externalId: true,
            },
          });

          const effectiveStatus = latestOutcome?.status ?? locked.status;
          const derivedStatus = this.derivePayoutStatus({
            type: locked.type,
            status: locked.status,
            createdAt: locked.created_at,
            outcomes: latestOutcome
              ? [
                  {
                    status: latestOutcome.status,
                    createdAt: latestOutcome.createdAt,
                  },
                ]
              : [],
          });

          if (derivedStatus !== `failed` && derivedStatus !== `stuck`) {
            throw new ConflictException(`Only failed or stuck payouts can be escalated`);
          }

          const existingEscalation = await tx.payoutEscalationModel.findUnique({
            where: {
              ledgerEntryId: locked.id,
            },
            select: {
              id: true,
              createdAt: true,
              reason: true,
            },
          });

          if (existingEscalation) {
            return {
              payoutId: locked.id,
              escalationId: existingEscalation.id,
              createdAt: existingEscalation.createdAt.toISOString(),
              reason: existingEscalation.reason,
              effectiveStatus,
              derivedStatus,
              version: deriveVersion(locked.updated_at),
              alreadyEscalated: true,
            };
          }

          const escalation = await tx.payoutEscalationModel.create({
            data: {
              ledgerEntryId: locked.id,
              escalatedBy: adminId,
              reason,
              confirmed: true,
            },
            select: {
              id: true,
              createdAt: true,
              reason: true,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.payout_escalate,
              resource: `payout`,
              resourceId: locked.id,
              metadata: {
                confirmed: true,
                reason,
                derivedStatus,
                effectiveStatus,
                persistedStatus: locked.status,
                expectedVersion,
                escalationId: escalation.id,
                payoutType: locked.type,
                paymentRequestId: locked.payment_request_id,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            payoutId: locked.id,
            escalationId: escalation.id,
            createdAt: escalation.createdAt.toISOString(),
            reason: escalation.reason,
            effectiveStatus,
            derivedStatus,
            version: deriveVersion(locked.updated_at),
            alreadyEscalated: false,
          };
        });
      },
    });
  }
}
