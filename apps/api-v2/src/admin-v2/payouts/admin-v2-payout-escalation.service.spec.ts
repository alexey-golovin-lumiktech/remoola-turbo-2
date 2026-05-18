import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { type AdminV2PayoutEscalationRepository } from './admin-v2-payout-escalation.repository';
import { AdminV2PayoutEscalationService } from './admin-v2-payout-escalation.service';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

describe(`AdminV2PayoutEscalationService`, () => {
  const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);
  const tx = { kind: `tx` };

  function buildService() {
    const calls: string[] = [];
    const transactions = {
      runLedgerMutation: jest.fn(async (callback: (txArg: unknown) => Promise<unknown>) => {
        calls.push(`transaction`);
        return callback(tx);
      }),
    };
    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => {
        calls.push(`idempotency`);
        return execute();
      }),
    };
    const repository = {
      findEscalationPreflight: jest.fn(async () => {
        calls.push(`preflight`);
        return {
          id: `payout-1`,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.PENDING,
          createdAt: new Date(`2026-04-14T00:00:00.000Z`),
          updatedAt,
          deletedAt: null,
          outcomes: [{ status: $Enums.TransactionStatus.DENIED, createdAt: new Date(`2026-04-14T08:00:00.000Z`) }],
        };
      }),
      lockPayoutForEscalation: jest.fn(async () => {
        calls.push(`lock`);
        return {
          id: `payout-1`,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.PENDING,
          consumer_id: `consumer-1`,
          payment_request_id: `payment-1`,
          created_at: new Date(`2026-04-14T00:00:00.000Z`),
          updated_at: updatedAt,
          deleted_at: null,
        };
      }),
      findLatestOutcome: jest.fn(async () => {
        calls.push(`latestOutcome`);
        return {
          status: $Enums.TransactionStatus.DENIED as $Enums.TransactionStatus,
          createdAt: new Date(`2026-04-14T08:00:00.000Z`),
          externalId: `po_failed` as string | null,
        };
      }),
      findExistingEscalation: jest.fn(async () => {
        calls.push(`existingEscalation`);
        return null;
      }),
      createEscalationWithAudit: jest.fn(async () => {
        calls.push(`createEscalation`);
        return {
          id: `esc-1`,
          createdAt: new Date(`2026-04-16T10:00:00.000Z`),
          reason: `Ops handoff`,
        };
      }),
    };

    return {
      calls,
      idempotency,
      repository,
      transactions,
      service: new AdminV2PayoutEscalationService(
        transactions as unknown as PrismaTransactionRunner,
        idempotency as unknown as AdminV2IdempotencyService,
        repository as unknown as AdminV2PayoutEscalationRepository,
      ),
    };
  }

  it(`validates confirmation and version before entering idempotency`, async () => {
    const { idempotency, service } = buildService();

    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: false, version: updatedAt.getTime() }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: true, version: 0 }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.execute).not.toHaveBeenCalled();
  });

  it(`rejects stale preflight versions before opening the ledger transaction`, async () => {
    const { repository, transactions, service } = buildService();
    repository.findEscalationPreflight.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T10:00:00.000Z`),
      deletedAt: null,
      outcomes: [],
    });

    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: true, version: updatedAt.getTime() }, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactions.runLedgerMutation).not.toHaveBeenCalled();
  });

  it(`preserves lock-before-outcome order and blocks statuses outside failed or stuck`, async () => {
    const { calls, repository, service } = buildService();
    repository.findLatestOutcome.mockImplementationOnce(async () => {
      calls.push(`latestOutcome`);
      return {
        status: $Enums.TransactionStatus.COMPLETED,
        createdAt: new Date(`2026-04-16T08:30:00.000Z`),
        externalId: null,
      };
    });

    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: true, version: updatedAt.getTime() }, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(calls).toEqual([`idempotency`, `preflight`, `transaction`, `lock`, `latestOutcome`]);
    expect(repository.findExistingEscalation).not.toHaveBeenCalled();
    expect(repository.createEscalationWithAudit).not.toHaveBeenCalled();
  });

  it(`rejects stale or soft-deleted locked rows before reading latest outcomes`, async () => {
    const { repository, service } = buildService();
    repository.lockPayoutForEscalation.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      consumer_id: `consumer-1`,
      payment_request_id: null,
      created_at: new Date(`2026-04-14T00:00:00.000Z`),
      updated_at: new Date(`2026-04-16T10:00:00.000Z`),
      deleted_at: null,
    });

    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: true, version: updatedAt.getTime() }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findLatestOutcome).not.toHaveBeenCalled();

    repository.findLatestOutcome.mockClear();
    repository.lockPayoutForEscalation.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      consumer_id: `consumer-1`,
      payment_request_id: null,
      created_at: new Date(`2026-04-14T00:00:00.000Z`),
      updated_at: updatedAt,
      deleted_at: new Date(`2026-04-16T10:00:00.000Z`),
    });

    await expect(
      service.escalatePayout(`payout-1`, `admin-1`, { confirmed: true, version: updatedAt.getTime() }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findLatestOutcome).not.toHaveBeenCalled();
  });

  it(`returns existing escalation markers without creating audit records`, async () => {
    const { repository, service } = buildService();
    repository.findExistingEscalation.mockResolvedValueOnce({
      id: `esc-existing`,
      createdAt: new Date(`2026-04-16T10:00:00.000Z`),
      reason: `Existing escalation`,
    });

    const result = await service.escalatePayout(
      `payout-1`,
      `admin-1`,
      { confirmed: true, version: updatedAt.getTime() },
      { idempotencyKey: `idem-1` },
    );

    expect(repository.createEscalationWithAudit).not.toHaveBeenCalled();
    expect(result).toEqual({
      payoutId: `payout-1`,
      escalationId: `esc-existing`,
      createdAt: `2026-04-16T10:00:00.000Z`,
      reason: `Existing escalation`,
      effectiveStatus: `DENIED`,
      derivedStatus: `failed`,
      version: updatedAt.getTime(),
      alreadyEscalated: true,
    });
  });

  it(`creates escalation with unchanged idempotency scope and audit params`, async () => {
    const { idempotency, repository, service } = buildService();

    const result = await service.escalatePayout(
      `payout-1`,
      `admin-1`,
      { confirmed: true, version: updatedAt.getTime(), reason: ` Ops handoff ` },
      {
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
        idempotencyKey: `idem-2`,
      },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `payout-escalate:payout-1`,
        key: `idem-2`,
        payload: {
          payoutId: `payout-1`,
          expectedVersion: updatedAt.getTime(),
          confirmed: true,
          reason: `Ops handoff`,
        },
      }),
    );
    expect(repository.createEscalationWithAudit).toHaveBeenCalledWith(tx, {
      payoutId: `payout-1`,
      adminId: `admin-1`,
      reason: `Ops handoff`,
      expectedVersion: updatedAt.getTime(),
      derivedStatus: `failed`,
      effectiveStatus: $Enums.TransactionStatus.DENIED,
      persistedStatus: $Enums.TransactionStatus.PENDING,
      payoutType: $Enums.LedgerEntryType.USER_PAYOUT,
      paymentRequestId: `payment-1`,
      meta: {
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
        idempotencyKey: `idem-2`,
      },
    });
    expect(result).toEqual({
      payoutId: `payout-1`,
      escalationId: `esc-1`,
      createdAt: `2026-04-16T10:00:00.000Z`,
      reason: `Ops handoff`,
      effectiveStatus: `DENIED`,
      derivedStatus: `failed`,
      version: updatedAt.getTime(),
      alreadyEscalated: false,
    });
  });
});
