import { Injectable, NotFoundException } from '@nestjs/common';

import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { buildCreatedAtCursorWhere, normalizeLimit, PAYOUT_TYPES } from './admin-v2-payout-query.helpers';
import { mapPayoutCase, mapPayoutListItem, type PayoutListRow } from './admin-v2-payout.presenter';
import { AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import { PayoutHighValuePolicyService } from './payout-high-value-policy.service';
import { PayoutPaymentMethodResolverService } from './payout-payment-method-resolver.service';
import { PAYOUT_STUCK_THRESHOLD_HOURS } from './payout-status-deriver';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

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
      items: visibleRows.map((row) =>
        mapPayoutListItem({
          entry: row,
          assignedTo: assigneeMap.get(row.id) ?? null,
          highValue: this.highValuePolicy.assess(row),
          destination: this.paymentMethodResolver.resolveDestination(row, paymentMethodsById),
        }),
      ),
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
    return mapPayoutCase({
      entry,
      relatedEntries,
      auditContext,
      assignment,
      highValuePolicy: highValueConfig.policy,
      highValue: this.highValuePolicy.assess(entry),
      destination: this.paymentMethodResolver.resolveDestination(entry, paymentMethodsById),
    });
  }
}
