import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type AdminExchangeActionLockRepository } from './admin-exchange-action-lock.repository';
import { AdminExchangeRuleCommandsService } from './admin-exchange-rule-commands.service';
import { type AdminExchangeRulePersistenceRepository } from './admin-exchange-rule-persistence.repository';
import { type AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { type ExchangeConversionExecutor } from './exchange-conversion-executor';
import { BalanceCalculationMode, type BalanceCalculationService } from '../../shared/balance-calculation.service';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { type AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { deriveVersion } from '../admin-v2-version-utils';

describe(`AdminExchangeRuleCommandsService`, () => {
  const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
  const idempotencyKey = `77777777-7777-4777-8777-777777777777`;
  const meta = {
    idempotencyKey,
    ipAddress: `127.0.0.1`,
    userAgent: `jest`,
  };
  const tx = { kind: `tx` };

  function buildLockedRule(overrides: Record<string, unknown> = {}) {
    return {
      id: `rule-1`,
      consumer_id: `consumer-1`,
      from_currency: $Enums.CurrencyCode.USD,
      to_currency: $Enums.CurrencyCode.EUR,
      target_balance: 100,
      max_convert_amount: null,
      min_interval_minutes: 60,
      next_run_at: null,
      last_run_at: null,
      enabled: true,
      metadata: null,
      updated_at: updatedAt,
      deleted_at: null,
      consumer_email: `consumer@example.com`,
      ...overrides,
    };
  }

  function buildService() {
    const idempotency = {
      execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    const domainEvents = {
      publishAfterCommit: jest.fn<(...a: any[]) => any>(async () => undefined),
    };
    const balanceService = {
      calculateInTransaction: jest.fn<(...a: any[]) => any>(async () => 150),
    };
    const conversionExecutor = {
      executeInTransaction: jest.fn<(...a: any[]) => any>(async () => ({
        ledgerId: `ledger-1`,
        entryId: `entry-1`,
        targetAmount: 22.5,
      })),
    };
    const preflightRepository = {
      findActiveRuleById: jest.fn<(...a: any[]) => any>(async () => ({
        id: `rule-1`,
        updatedAt,
      })),
    };
    const actionLockRepository = {
      tryActionLock: jest.fn<(...a: any[]) => any>(async () => true),
    };
    const persistenceRepository = {
      setRuleEnabled: jest.fn<(...a: any[]) => any>(async (_client, params: { enabled: boolean }) => ({
        ruleId: `rule-1`,
        enabled: params.enabled,
        version: deriveVersion(updatedAt),
      })),
      lockRuleExecutionRow: jest.fn<(...a: any[]) => any>(async () => buildLockedRule()),
      finalizeRuleExecution: jest.fn<(...a: any[]) => any>(async () => ({
        ruleId: `rule-1`,
        version: deriveVersion(updatedAt),
        lastRunAt: `2026-04-17T10:00:00.000Z`,
        nextRunAt: `2026-04-17T11:00:00.000Z`,
      })),
    };
    const transactions = {
      runLedgerMutation: jest.fn<(...a: any[]) => any>(async (callback: (client: unknown) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    return {
      actionLockRepository,
      balanceService,
      conversionExecutor,
      domainEvents,
      idempotency,
      persistenceRepository,
      preflightRepository,
      service: new AdminExchangeRuleCommandsService(
        idempotency as unknown as AdminV2IdempotencyService,
        domainEvents as unknown as AdminV2DomainEventsService,
        balanceService as unknown as BalanceCalculationService,
        conversionExecutor as unknown as ExchangeConversionExecutor,
        preflightRepository as unknown as AdminV2ExchangePreflightRepository,
        actionLockRepository as unknown as AdminExchangeActionLockRepository,
        persistenceRepository as unknown as AdminExchangeRulePersistenceRepository,
        transactions as unknown as PrismaTransactionRunner,
      ),
      transactions,
    };
  }

  it(`preserves pause and resume idempotency scopes and transaction-scoped writes`, async () => {
    const { idempotency, persistenceRepository, service, transactions } = buildService();

    await expect(service.pauseRule(`rule-1`, `admin-1`, { version: 0 }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await service.pauseRule(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);
    await service.resumeRule(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);

    expect(idempotency.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-rule-pause:rule-1`,
        key: idempotencyKey,
        payload: { ruleId: `rule-1`, expectedVersion: deriveVersion(updatedAt) },
      }),
    );
    expect(idempotency.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-rule-resume:rule-1`,
        key: idempotencyKey,
        payload: { ruleId: `rule-1`, expectedVersion: deriveVersion(updatedAt) },
      }),
    );
    expect(transactions.runLedgerMutation).toHaveBeenCalledTimes(2);
    expect(persistenceRepository.setRuleEnabled).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({ enabled: false, expectedVersion: deriveVersion(updatedAt) }),
    );
    expect(persistenceRepository.setRuleEnabled).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({ enabled: true, expectedVersion: deriveVersion(updatedAt) }),
    );
  });

  it(`rejects stale rule versions before transaction writes`, async () => {
    const { persistenceRepository, service, transactions } = buildService();

    await expect(service.pauseRule(`rule-1`, `admin-1`, { version: 1 }, meta)).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        message: `Exchange rule has been modified by another operator`,
        currentVersion: deriveVersion(updatedAt),
      },
    });

    expect(transactions.runLedgerMutation).not.toHaveBeenCalled();
    expect(persistenceRepository.setRuleEnabled).not.toHaveBeenCalled();
  });

  it(`validates run-now idempotency key and version before idempotency`, async () => {
    const { idempotency, service } = buildService();

    await expect(
      service.runRuleNow(
        `rule-1`,
        `admin-1`,
        { version: deriveVersion(updatedAt) },
        { ...meta, idempotencyKey: `bad` },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.runRuleNow(`rule-1`, `admin-1`, { version: 0 }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(idempotency.execute).not.toHaveBeenCalled();
  });

  it(`rejects rule action lock conflicts before balance or conversion work`, async () => {
    const { actionLockRepository, balanceService, conversionExecutor, persistenceRepository, service } = buildService();
    actionLockRepository.tryActionLock.mockResolvedValueOnce(false);

    await expect(
      service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta),
    ).rejects.toMatchObject({ response: { message: errorCodes.CONVERSION_ALREADY_PROCESSING } });

    expect(balanceService.calculateInTransaction).not.toHaveBeenCalled();
    expect(conversionExecutor.executeInTransaction).not.toHaveBeenCalled();
    expect(persistenceRepository.finalizeRuleExecution).not.toHaveBeenCalled();
  });

  it(`rejects missing, deleted, and stale locked rule rows before downstream execution`, async () => {
    const { actionLockRepository, balanceService, conversionExecutor, domainEvents, persistenceRepository, service } =
      buildService();

    persistenceRepository.lockRuleExecutionRow.mockResolvedValueOnce(null);
    await expect(
      service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    persistenceRepository.lockRuleExecutionRow.mockResolvedValueOnce(
      buildLockedRule({ deleted_at: new Date(`2026-04-17T10:01:00.000Z`) }),
    );
    await expect(
      service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta),
    ).rejects.toBeInstanceOf(NotFoundException);

    persistenceRepository.lockRuleExecutionRow.mockResolvedValueOnce(
      buildLockedRule({ updated_at: new Date(`2026-04-17T10:05:00.000Z`) }),
    );
    await expect(
      service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta),
    ).rejects.toMatchObject({
      response: {
        error: `STALE_VERSION`,
        currentVersion: new Date(`2026-04-17T10:05:00.000Z`).getTime(),
      },
    });

    expect(actionLockRepository.tryActionLock).not.toHaveBeenCalled();
    expect(balanceService.calculateInTransaction).not.toHaveBeenCalled();
    expect(conversionExecutor.executeInTransaction).not.toHaveBeenCalled();
    expect(persistenceRepository.finalizeRuleExecution).not.toHaveBeenCalled();
    expect(domainEvents.publishAfterCommit).not.toHaveBeenCalled();
  });

  it(`finalizes balance_below_target and no_amount_to_convert summaries and publishes failed events`, async () => {
    const { balanceService, conversionExecutor, domainEvents, persistenceRepository, service } = buildService();
    balanceService.calculateInTransaction.mockResolvedValueOnce(100).mockResolvedValueOnce(150);
    persistenceRepository.lockRuleExecutionRow
      .mockResolvedValueOnce(buildLockedRule())
      .mockResolvedValueOnce(buildLockedRule({ max_convert_amount: 0 }));

    const belowTarget = await service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);
    const noAmount = await service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);

    expect(belowTarget.summary.reason).toBe(`balance_below_target`);
    expect(noAmount.summary.reason).toBe(`no_amount_to_convert`);
    expect(conversionExecutor.executeInTransaction).not.toHaveBeenCalled();
    expect(persistenceRepository.finalizeRuleExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        summary: expect.objectContaining({ status: `failed`, reason: `balance_below_target` }),
      }),
    );
    expect(persistenceRepository.finalizeRuleExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        summary: expect.objectContaining({ status: `failed`, reason: `no_amount_to_convert` }),
      }),
    );
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: `exchange.failed`, resourceType: `exchange_rule`, resourceId: `rule-1` }),
    );
  });

  it(`finalizes mapped conversion failures and publishes failed downstream triggers after commit`, async () => {
    const { conversionExecutor, domainEvents, persistenceRepository, service } = buildService();
    conversionExecutor.executeInTransaction.mockRejectedValueOnce(new BadRequestException(errorCodes.RATE_STALE));

    const result = await service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);

    expect(result.executionState).toBe(`failed`);
    expect(result.summary).toEqual(
      expect.objectContaining({
        status: `failed`,
        reason: errorCodes.RATE_STALE,
        source: `admin_rule_run`,
        actorId: `admin-1`,
        idempotencyKey,
      }),
    );
    expect(persistenceRepository.finalizeRuleExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        summary: expect.objectContaining({
          status: `failed`,
          reason: errorCodes.RATE_STALE,
        }),
      }),
    );
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: `exchange.failed`,
        resourceType: `exchange_rule`,
        resourceId: `rule-1`,
        metadata: {
          reason: errorCodes.RATE_STALE,
          ledgerId: null,
          sourceAmount: null,
          targetAmount: null,
        },
      }),
    );
    expect(persistenceRepository.finalizeRuleExecution.mock.invocationCallOrder[0]).toBeLessThan(
      domainEvents.publishAfterCommit.mock.invocationCallOrder[0],
    );
  });

  it(`preserves successful run-now conversion summary and event publishing`, async () => {
    const {
      actionLockRepository,
      balanceService,
      conversionExecutor,
      domainEvents,
      idempotency,
      persistenceRepository,
      service,
    } = buildService();
    persistenceRepository.lockRuleExecutionRow.mockResolvedValueOnce(buildLockedRule({ max_convert_amount: 25 }));

    const result = await service.runRuleNow(`rule-1`, `admin-1`, { version: deriveVersion(updatedAt) }, meta);

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `exchange-rule-run-now:rule-1`,
        key: idempotencyKey,
        payload: { ruleId: `rule-1`, expectedVersion: deriveVersion(updatedAt) },
      }),
    );
    expect(actionLockRepository.tryActionLock).toHaveBeenCalledWith(tx, `exchange_rule_run_now:rule-1`);
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(tx, `consumer-1`, $Enums.CurrencyCode.USD, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
    expect(actionLockRepository.tryActionLock.mock.invocationCallOrder[0]).toBeLessThan(
      balanceService.calculateInTransaction.mock.invocationCallOrder[0],
    );
    expect(conversionExecutor.executeInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        consumerId: `consumer-1`,
        amount: 25,
        createdBy: `admin-1`,
        updatedBy: `admin-1`,
        idempotencyKeyPrefix: idempotencyKey,
        metadata: {
          source: `admin_rule_run`,
          ruleId: `rule-1`,
          initiatedBy: `admin-1`,
        },
      }),
    );
    expect(balanceService.calculateInTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      conversionExecutor.executeInTransaction.mock.invocationCallOrder[0],
    );
    expect(persistenceRepository.finalizeRuleExecution).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        expectedVersion: deriveVersion(updatedAt),
        adminId: `admin-1`,
        idempotencyKey,
        summary: expect.objectContaining({
          status: `executed`,
          reason: `conversion_executed`,
          ledgerId: `ledger-1`,
          sourceAmount: `25.00`,
          targetAmount: `22.5`,
          source: `admin_rule_run`,
        }),
      }),
    );
    expect(conversionExecutor.executeInTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      persistenceRepository.finalizeRuleExecution.mock.invocationCallOrder[0],
    );
    expect(persistenceRepository.finalizeRuleExecution.mock.invocationCallOrder[0]).toBeLessThan(
      domainEvents.publishAfterCommit.mock.invocationCallOrder[0],
    );
    expect(result).toEqual(
      expect.objectContaining({
        ruleId: `rule-1`,
        version: deriveVersion(updatedAt),
        executionState: `executed`,
        summary: expect.objectContaining({
          status: `executed`,
          reason: `conversion_executed`,
          ledgerId: `ledger-1`,
          sourceAmount: `25.00`,
          targetAmount: `22.5`,
          source: `admin_rule_run`,
        }),
      }),
    );
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: `exchange.executed`,
        resourceType: `exchange_rule`,
        resourceId: `rule-1`,
        metadata: {
          reason: `conversion_executed`,
          ledgerId: `ledger-1`,
          sourceAmount: `25.00`,
          targetAmount: `22.5`,
        },
      }),
    );
  });
});
