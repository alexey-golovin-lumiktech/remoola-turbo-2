import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';
import { AdminV2PayoutEscalationRepository } from './admin-v2-payout-escalation.repository';
import { derivePayoutStatus, type PayoutDerivedStatus } from './payout-status-deriver';

const REASON_MAX_LENGTH = 500;
const PAYOUT_TYPES = [$Enums.LedgerEntryType.USER_PAYOUT, $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL] as const;

export type PayoutEscalationRequestBody = {
  confirmed?: boolean;
  version?: number;
  reason?: string | null;
};

export type PayoutEscalationRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type PayoutEscalationResult = {
  payoutId: string;
  escalationId: string;
  createdAt: string;
  reason: string | null;
  effectiveStatus: $Enums.TransactionStatus;
  derivedStatus: PayoutDerivedStatus;
  version: number;
  alreadyEscalated: boolean;
};

function buildPayoutStaleVersionPayload(currentUpdatedAt: Date) {
  return buildStaleVersionPayload(`Payout case`, currentUpdatedAt);
}

@Injectable()
export class AdminV2PayoutEscalationService {
  constructor(
    private readonly transactions: PrismaTransactionRunner,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly payoutEscalationRepository: AdminV2PayoutEscalationRepository,
  ) {}

  async escalatePayout(
    payoutId: string,
    adminId: string,
    body: PayoutEscalationRequestBody,
    meta: PayoutEscalationRequestMeta,
  ): Promise<PayoutEscalationResult> {
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
        const payout = await this.payoutEscalationRepository.findEscalationPreflight(payoutId);

        if (!payout || !PAYOUT_TYPES.includes(payout.type as (typeof PAYOUT_TYPES)[number])) {
          throw new NotFoundException(`Payout not found`);
        }

        if (deriveVersion(payout.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildPayoutStaleVersionPayload(payout.updatedAt));
        }

        return this.transactions.runLedgerMutation(async (tx) => {
          const locked = await this.payoutEscalationRepository.lockPayoutForEscalation(tx, payoutId);
          if (!locked || !PAYOUT_TYPES.includes(locked.type as (typeof PAYOUT_TYPES)[number])) {
            throw new NotFoundException(`Payout not found`);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildPayoutStaleVersionPayload(locked.updated_at));
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Soft-deleted payouts remain investigation-only`);
          }

          const latestOutcome = await this.payoutEscalationRepository.findLatestOutcome(tx, locked.id);

          const effectiveStatus = latestOutcome?.status ?? locked.status;
          const derivedStatus = derivePayoutStatus({
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

          const existingEscalation = await this.payoutEscalationRepository.findExistingEscalation(tx, locked.id);

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

          const escalation = await this.payoutEscalationRepository.createEscalationWithAudit(tx, {
            payoutId: locked.id,
            adminId,
            reason,
            expectedVersion,
            derivedStatus,
            effectiveStatus,
            persistedStatus: locked.status,
            payoutType: locked.type,
            paymentRequestId: locked.payment_request_id,
            meta,
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

  private normalizeEscalationReason(reason: string | null | undefined) {
    const normalized = reason?.trim() || null;
    if (normalized && normalized.length > REASON_MAX_LENGTH) {
      throw new BadRequestException(`Escalation reason is too long`);
    }
    return normalized;
  }
}
