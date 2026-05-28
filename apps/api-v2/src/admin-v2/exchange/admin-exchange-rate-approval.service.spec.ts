import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { type AdminExchangeRateApprovalPersistenceRepository } from './admin-exchange-rate-approval-persistence.repository'; // eslint-disable-line
import { AdminExchangeRateApprovalService } from './admin-exchange-rate-approval.service';
import { type AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { deriveVersion } from '../admin-v2-version-utils';

describe(`AdminExchangeRateApprovalService`, () => {
  const updatedAt = new Date(`2026-04-17T08:05:00.000Z`);
  const meta = {
    idempotencyKey: `idem-rate-1`,
    ipAddress: `127.0.0.1`,
    userAgent: `jest`,
  };
  const tx = { kind: `tx` };

  function buildService() {
    const idempotency = {
      execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    const preflightRepository = {
      findActiveRateById: jest.fn<(...a: any[]) => any>(async () => ({
        id: `rate-1`,
        updatedAt,
      })),
    };
    const persistenceRepository = {
      approveDraftRate: jest.fn<(...a: any[]) => any>(async () => ({
        rateId: `rate-1`,
        status: $Enums.ExchangeRateStatus.APPROVED,
        approvedAt: `2026-04-17T08:06:00.000Z`,
        version: updatedAt.getTime(),
      })),
    };
    const transactions = {
      runLedgerMutation: jest.fn<(...a: any[]) => any>(async (callback: (client: unknown) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    return {
      idempotency,
      persistenceRepository,
      preflightRepository,
      service: new AdminExchangeRateApprovalService(
        idempotency as unknown as AdminV2IdempotencyService,
        preflightRepository as unknown as AdminV2ExchangePreflightRepository,
        persistenceRepository as unknown as AdminExchangeRateApprovalPersistenceRepository,
        transactions as unknown as PrismaTransactionRunner,
      ),
      transactions,
    };
  }

  it(`validates confirmation, reason, and version before idempotency`, async () => {
    const { idempotency, service } = buildService();

    await expect(
      service.approveRate(
        `rate-1`,
        `admin-1`,
        { confirmed: false, version: deriveVersion(updatedAt), reason: `ok` },
        meta,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.approveRate(
        `rate-1`,
        `admin-1`,
        { confirmed: true, version: deriveVersion(updatedAt), reason: ` ` },
        meta,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.approveRate(`rate-1`, `admin-1`, { confirmed: true, version: 0, reason: `ok` }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.execute).not.toHaveBeenCalled();
  });

  it(`preserves idempotency scope, payload, and transaction-scoped approval write`, async () => {
    const { idempotency, persistenceRepository, service, transactions } = buildService();

    const result = await service.approveRate(
      `rate-1`,
      `admin-1`,
      { confirmed: true, version: deriveVersion(updatedAt), reason: `Reviewed spread` },
      meta,
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-rate-approve:rate-1`,
        key: `idem-rate-1`,
        payload: {
          rateId: `rate-1`,
          expectedVersion: deriveVersion(updatedAt),
          confirmed: true,
          reason: `Reviewed spread`,
        },
      }),
    );
    expect(transactions.runLedgerMutation).toHaveBeenCalledTimes(1);
    expect(persistenceRepository.approveDraftRate).toHaveBeenCalledWith(tx, {
      rateId: `rate-1`,
      expectedVersion: deriveVersion(updatedAt),
      adminId: `admin-1`,
      reason: `Reviewed spread`,
      meta,
    });
    expect(result).toEqual({
      rateId: `rate-1`,
      status: $Enums.ExchangeRateStatus.APPROVED,
      approvedAt: `2026-04-17T08:06:00.000Z`,
      version: deriveVersion(updatedAt),
    });
  });

  it(`rejects missing active rates before approval writes`, async () => {
    const { persistenceRepository, preflightRepository, service } = buildService();
    preflightRepository.findActiveRateById.mockResolvedValueOnce(null);

    await expect(
      service.approveRate(
        `rate-1`,
        `admin-1`,
        { confirmed: true, version: deriveVersion(updatedAt), reason: `Reviewed spread` },
        meta,
      ),
    ).rejects.toMatchObject({ response: { message: adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND } });

    expect(persistenceRepository.approveDraftRate).not.toHaveBeenCalled();
  });

  it(`rejects stale rate versions with stale-version payload before approval writes`, async () => {
    const { persistenceRepository, service } = buildService();

    await expect(
      service.approveRate(`rate-1`, `admin-1`, { confirmed: true, version: 1, reason: `Reviewed spread` }, meta),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        message: `Exchange rate has been modified by another operator`,
        currentVersion: deriveVersion(updatedAt),
        currentUpdatedAt: updatedAt.toISOString(),
        recommendedAction: `reload`,
      },
    });
    await expect(
      service.approveRate(`rate-1`, `admin-1`, { confirmed: true, version: 1, reason: `Reviewed spread` }, meta),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(persistenceRepository.approveDraftRate).not.toHaveBeenCalled();
  });
});
