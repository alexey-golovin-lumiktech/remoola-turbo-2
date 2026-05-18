import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { type AdminExchangeActionLockRepository } from './admin-exchange-action-lock.repository';
import { AdminScheduledConversionCommandsService } from './admin-scheduled-conversion-commands.service';
import { type AdminV2ExchangePersistenceRepository } from './admin-v2-exchange-persistence.repository';
import { type AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { type ExchangeConversionExecutor } from './exchange-conversion-executor';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { deriveVersion } from '../admin-v2-version-utils';

describe(`AdminScheduledConversionCommandsService`, () => {
  const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
  const idempotencyKey = `88888888-8888-4888-8888-888888888888`;
  const meta = {
    idempotencyKey,
    ipAddress: `127.0.0.1`,
    userAgent: `jest`,
  };
  const tx = { kind: `tx` };

  function buildLockedConversion(overrides: Record<string, unknown> = {}) {
    return {
      id: `scheduled-1`,
      consumer_id: `consumer-1`,
      from_currency: $Enums.CurrencyCode.USD,
      to_currency: $Enums.CurrencyCode.EUR,
      amount: 25,
      status: $Enums.ScheduledFxConversionStatus.PENDING,
      execute_at: new Date(`2026-04-17T09:30:00.000Z`),
      processing_at: null,
      executed_at: null,
      failed_at: null,
      attempts: 0,
      last_error: null,
      ledger_id: null,
      metadata: { ruleId: `rule-1` },
      updated_at: updatedAt,
      deleted_at: null,
      ...overrides,
    };
  }

  function buildService() {
    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    const domainEvents = {
      publishAfterCommit: jest.fn(async () => undefined),
    };
    const conversionExecutor = {
      executeInTransaction: jest.fn(async () => ({ ledgerId: `ledger-1`, entryId: `entry-1`, targetAmount: 22.5 })),
    };
    const preflightRepository = {
      findActiveScheduledConversionById: jest.fn(async () => ({
        id: `scheduled-1`,
        updatedAt,
      })),
    };
    const actionLockRepository = {
      tryActionLock: jest.fn(async () => true),
    };
    const persistenceRepository = {
      lockScheduledExecutionRow: jest.fn(async () => buildLockedConversion()),
      finalizeScheduledExecution: jest.fn(async () => ({
        conversionId: `scheduled-1`,
        version: deriveVersion(updatedAt),
      })),
      cancelScheduledConversion: jest.fn(async () => ({
        conversionId: `scheduled-1`,
        status: $Enums.ScheduledFxConversionStatus.CANCELLED,
        version: deriveVersion(updatedAt),
      })),
    };
    const transactions = {
      runLedgerMutation: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
    };

    return {
      actionLockRepository,
      conversionExecutor,
      domainEvents,
      idempotency,
      persistenceRepository,
      preflightRepository,
      service: new AdminScheduledConversionCommandsService(
        idempotency as unknown as AdminV2IdempotencyService,
        domainEvents as unknown as AdminV2DomainEventsService,
        conversionExecutor as unknown as ExchangeConversionExecutor,
        preflightRepository as unknown as AdminV2ExchangePreflightRepository,
        actionLockRepository as unknown as AdminExchangeActionLockRepository,
        persistenceRepository as unknown as AdminV2ExchangePersistenceRepository,
        transactions as unknown as PrismaTransactionRunner,
      ),
      transactions,
    };
  }

  it(`validates force-execute confirmation, idempotency key, and version before idempotency`, async () => {
    const { idempotency, service } = buildService();

    await expect(
      service.forceExecuteScheduledConversion(`scheduled-1`, `admin-1`, { confirmed: false, version: 1 }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.forceExecuteScheduledConversion(
        `scheduled-1`,
        `admin-1`,
        { confirmed: true, version: 1 },
        { ...meta, idempotencyKey: `bad-key` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.forceExecuteScheduledConversion(`scheduled-1`, `admin-1`, { confirmed: true, version: 0 }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(idempotency.execute).not.toHaveBeenCalled();
  });

  it(`preserves force-execute idempotency scope, action lock, summary, and event publish`, async () => {
    const {
      actionLockRepository,
      conversionExecutor,
      domainEvents,
      idempotency,
      persistenceRepository,
      service,
      transactions,
    } = buildService();

    const result = await service.forceExecuteScheduledConversion(
      `scheduled-1`,
      `admin-1`,
      { confirmed: true, version: deriveVersion(updatedAt) },
      meta,
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-scheduled-force-execute:scheduled-1`,
        key: idempotencyKey,
        payload: {
          conversionId: `scheduled-1`,
          expectedVersion: deriveVersion(updatedAt),
          confirmed: true,
        },
      }),
    );
    expect(transactions.runLedgerMutation).toHaveBeenCalledTimes(1);
    expect(actionLockRepository.tryActionLock).toHaveBeenCalledWith(tx, `exchange_scheduled_force_execute:scheduled-1`);
    expect(conversionExecutor.executeInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        consumerId: `consumer-1`,
        fromCurrency: $Enums.CurrencyCode.USD,
        toCurrency: $Enums.CurrencyCode.EUR,
        amount: 25,
        idempotencyKeyPrefix: idempotencyKey,
        metadata: {
          source: `admin_scheduled_force_execute`,
          initiatedBy: `admin-1`,
          scheduledConversionId: `scheduled-1`,
          ruleId: `rule-1`,
        },
      }),
    );
    expect(persistenceRepository.finalizeScheduledExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        expectedVersion: deriveVersion(updatedAt),
        adminId: `admin-1`,
        idempotencyKey,
        summary: expect.objectContaining({
          status: `executed`,
          reason: `conversion_executed`,
          ledgerId: `ledger-1`,
          targetAmount: `22.5`,
          sourceAmount: `25`,
          source: `admin_scheduled_force_execute`,
        }),
      }),
    );
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: `exchange.executed`,
        resourceType: `scheduled_fx_conversion`,
        resourceId: `scheduled-1`,
        producerVersion: deriveVersion(updatedAt),
        metadata: {
          status: `executed`,
          reason: `conversion_executed`,
          ledgerId: `ledger-1`,
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        conversionId: `scheduled-1`,
        version: deriveVersion(updatedAt),
        executionState: `executed`,
        summary: expect.objectContaining({ status: `executed`, ledgerId: `ledger-1` }),
      }),
    );
  });

  it(`finalizes failed force-execute summaries without publishing exchange.executed`, async () => {
    const { conversionExecutor, domainEvents, persistenceRepository, service } = buildService();
    conversionExecutor.executeInTransaction.mockRejectedValueOnce(new BadRequestException(errorCodes.RATE_STALE));

    const result = await service.forceExecuteScheduledConversion(
      `scheduled-1`,
      `admin-1`,
      { confirmed: true, version: deriveVersion(updatedAt) },
      meta,
    );

    expect(result.executionState).toBe(`failed`);
    expect(result.summary).toEqual(
      expect.objectContaining({
        status: `failed`,
        reason: errorCodes.RATE_STALE,
        source: `admin_scheduled_force_execute`,
      }),
    );
    expect(persistenceRepository.finalizeScheduledExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        summary: expect.objectContaining({ status: `failed`, reason: errorCodes.RATE_STALE }),
      }),
    );
    expect(domainEvents.publishAfterCommit).not.toHaveBeenCalled();
  });

  it(`rejects stale scheduled conversion versions before transaction writes`, async () => {
    const { persistenceRepository, service, transactions } = buildService();

    await expect(
      service.forceExecuteScheduledConversion(`scheduled-1`, `admin-1`, { confirmed: true, version: 1 }, meta),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        message: `Scheduled FX conversion has been modified by another operator`,
        currentVersion: deriveVersion(updatedAt),
      },
    });

    expect(transactions.runLedgerMutation).not.toHaveBeenCalled();
    expect(persistenceRepository.lockScheduledExecutionRow).not.toHaveBeenCalled();
  });

  it(`rejects terminal and concurrent force-execute states before conversion execution`, async () => {
    const { actionLockRepository, conversionExecutor, persistenceRepository, service } = buildService();
    persistenceRepository.lockScheduledExecutionRow.mockResolvedValueOnce(
      buildLockedConversion({ status: $Enums.ScheduledFxConversionStatus.EXECUTED }),
    );

    await expect(
      service.forceExecuteScheduledConversion(
        `scheduled-1`,
        `admin-1`,
        { confirmed: true, version: deriveVersion(updatedAt) },
        meta,
      ),
    ).rejects.toMatchObject({ response: { message: adminErrorCodes.ADMIN_CONVERSION_ALREADY_EXECUTED } });

    persistenceRepository.lockScheduledExecutionRow.mockResolvedValueOnce(
      buildLockedConversion({ status: $Enums.ScheduledFxConversionStatus.CANCELLED }),
    );
    await expect(
      service.forceExecuteScheduledConversion(
        `scheduled-1`,
        `admin-1`,
        { confirmed: true, version: deriveVersion(updatedAt) },
        meta,
      ),
    ).rejects.toMatchObject({ response: { message: adminErrorCodes.ADMIN_CONVERSION_ALREADY_CANCELLED } });

    actionLockRepository.tryActionLock.mockResolvedValueOnce(false);
    await expect(
      service.forceExecuteScheduledConversion(
        `scheduled-1`,
        `admin-1`,
        { confirmed: true, version: deriveVersion(updatedAt) },
        meta,
      ),
    ).rejects.toMatchObject({ response: { message: errorCodes.CONVERSION_ALREADY_PROCESSING } });

    expect(conversionExecutor.executeInTransaction).not.toHaveBeenCalled();
  });

  it(`preserves cancel validation, idempotency scope, and transaction-scoped cancel write`, async () => {
    const { idempotency, persistenceRepository, service, transactions } = buildService();

    await expect(
      service.cancelScheduledConversion(`scheduled-1`, `admin-1`, { confirmed: false, version: 1 }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.cancelScheduledConversion(`scheduled-1`, `admin-1`, { confirmed: true, version: 0 }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);

    const result = await service.cancelScheduledConversion(
      `scheduled-1`,
      `admin-1`,
      { confirmed: true, version: deriveVersion(updatedAt) },
      meta,
    );

    expect(idempotency.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-scheduled-cancel:scheduled-1`,
        key: idempotencyKey,
        payload: {
          conversionId: `scheduled-1`,
          expectedVersion: deriveVersion(updatedAt),
          confirmed: true,
        },
      }),
    );
    expect(transactions.runLedgerMutation).toHaveBeenCalledTimes(1);
    expect(persistenceRepository.cancelScheduledConversion).toHaveBeenCalledWith(tx, {
      conversionId: `scheduled-1`,
      expectedVersion: deriveVersion(updatedAt),
      adminId: `admin-1`,
      meta,
    });
    expect(result).toEqual({
      conversionId: `scheduled-1`,
      status: $Enums.ScheduledFxConversionStatus.CANCELLED,
      version: deriveVersion(updatedAt),
    });
  });
});
