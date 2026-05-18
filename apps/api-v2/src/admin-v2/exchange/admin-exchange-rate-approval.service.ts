import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminExchangeRateApprovalPersistenceRepository } from './admin-exchange-rate-approval-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
}

@Injectable()
export class AdminExchangeRateApprovalService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly preflightRepository: AdminV2ExchangePreflightRepository,
    private readonly persistenceRepository: AdminExchangeRateApprovalPersistenceRepository,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async approveRate(
    rateId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number; reason?: string | null },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for exchange rate approval`);
    }

    const reason = parseOptionalString(body.reason);
    if (!reason) {
      throw new BadRequestException(`Approval reason is required`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rate-approve:${rateId}`,
      key: meta.idempotencyKey,
      payload: {
        rateId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async () => {
        await this.assertActiveRateVersion(rateId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.persistenceRepository.approveDraftRate(tx, {
            rateId,
            expectedVersion,
            adminId,
            reason,
            meta,
          }),
        );
      },
    });
  }

  private async assertActiveRateVersion(rateId: string, expectedVersion: number) {
    const rate = await this.preflightRepository.findActiveRateById(rateId);
    if (!rate) {
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }
    if (deriveVersion(rate.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Exchange rate`, rate.updatedAt));
    }
  }
}
