import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import {
  AdminV2ExchangePersistenceRepository,
  type ExchangeExecutionSummary,
  type ExchangeRuleExecutionResult,
  type ExchangeScheduledExecutionResult,
  type LockedRuleExecutionRow,
  type LockedScheduledExecutionRow,
} from './admin-v2-exchange-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { ExchangeConversionExecutor } from './exchange-conversion-executor';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { getCurrencyFractionDigits } from '../../shared-common';
import { type AdminV2DomainEvent, AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type ExchangeExecutionState = `executed` | `failed`;

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
}

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
}

function adminIdOrConsumer(consumerId: string, adminId: string | null | undefined) {
  return adminId ?? consumerId;
}

function parseUuidOrThrow(raw: string | null | undefined, headerName: string) {
  const value = raw?.trim();
  if (!value) {
    throw new BadRequestException(`${headerName} header is required`);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new BadRequestException(`${headerName} header must be a UUID`);
  }
  return value;
}

@Injectable()
export class AdminV2ExchangeCommandsService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly domainEvents: AdminV2DomainEventsService,
    private readonly balanceService: BalanceCalculationService,
    private readonly conversionExecutor: ExchangeConversionExecutor,
    private readonly preflightRepository: AdminV2ExchangePreflightRepository,
    private readonly persistenceRepository: AdminV2ExchangePersistenceRepository,
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

  async pauseRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rule-pause:${ruleId}`,
      key: meta.idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        await this.assertActiveRuleVersion(ruleId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.persistenceRepository.setRuleEnabled(tx, {
            ruleId,
            expectedVersion,
            adminId,
            enabled: false,
            meta,
          }),
        );
      },
    });
  }

  async resumeRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rule-resume:${ruleId}`,
      key: meta.idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        await this.assertActiveRuleVersion(ruleId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.persistenceRepository.setRuleEnabled(tx, {
            ruleId,
            expectedVersion,
            adminId,
            enabled: true,
            meta,
          }),
        );
      },
    });
  }

  async runRuleNow(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const idempotencyKey = parseUuidOrThrow(meta.idempotencyKey, `Idempotency-Key`);
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    const result = await this.idempotency.execute({
      adminId,
      scope: `exchange-rule-run-now:${ruleId}`,
      key: idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        await this.assertActiveRuleVersion(ruleId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.runRuleNowInTransaction(tx, {
            ruleId,
            expectedVersion,
            adminId,
            idempotencyKey,
            meta,
          }),
        );
      },
    });

    await this.publishRuleEvent(adminId, ruleId, result.version, result.summary);
    return result;
  }

  async forceExecuteScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for scheduled FX execution`);
    }

    const idempotencyKey = parseUuidOrThrow(meta.idempotencyKey, `Idempotency-Key`);
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    const result = await this.idempotency.execute({
      adminId,
      scope: `exchange-scheduled-force-execute:${conversionId}`,
      key: idempotencyKey,
      payload: {
        conversionId,
        expectedVersion,
        confirmed: true,
      },
      execute: async () => {
        await this.assertActiveScheduledConversionVersion(conversionId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.forceExecuteScheduledConversionInTransaction(tx, {
            conversionId,
            expectedVersion,
            adminId,
            idempotencyKey,
            meta,
          }),
        );
      },
    });

    if (result.summary.status === `executed`) {
      await this.domainEvents.publishAfterCommit({
        eventType: `exchange.executed`,
        timestamp: new Date().toISOString(),
        actorId: adminId,
        resourceType: `scheduled_fx_conversion`,
        resourceId: conversionId,
        producerVersion: result.version,
        metadata: {
          status: result.summary.status,
          reason: result.summary.reason,
          ledgerId: result.summary.ledgerId ?? null,
        },
      });
    }

    return result;
  }

  async cancelScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for scheduled FX cancellation`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-scheduled-cancel:${conversionId}`,
      key: meta.idempotencyKey,
      payload: {
        conversionId,
        expectedVersion,
        confirmed: true,
      },
      execute: async () => {
        await this.assertActiveScheduledConversionVersion(conversionId, expectedVersion);

        return this.transactions.runLedgerMutation((tx) =>
          this.persistenceRepository.cancelScheduledConversion(tx, {
            conversionId,
            expectedVersion,
            adminId,
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

  private async assertActiveRuleVersion(ruleId: string, expectedVersion: number) {
    const rule = await this.preflightRepository.findActiveRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }
    if (deriveVersion(rule.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
    }
  }

  private async assertActiveScheduledConversionVersion(conversionId: string, expectedVersion: number) {
    const conversion = await this.preflightRepository.findActiveScheduledConversionById(conversionId);
    if (!conversion) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }
    if (deriveVersion(conversion.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, conversion.updatedAt));
    }
  }

  private async runRuleNowInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      ruleId: string;
      expectedVersion: number;
      adminId: string;
      idempotencyKey: string;
      meta: RequestMeta;
    },
  ): Promise<ExchangeRuleExecutionResult> {
    const locked = await this.persistenceRepository.lockRuleExecutionRow(tx, params.ruleId);
    if (!locked || locked.deleted_at) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }
    if (deriveVersion(locked.updated_at) !== params.expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
    }
    if (!(await this.persistenceRepository.tryActionLock(tx, `exchange_rule_run_now:${params.ruleId}`))) {
      throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
    }

    const now = new Date();
    const execution = await this.executeRuleConversion(tx, locked, {
      source: `admin_rule_run`,
      actorId: params.adminId,
      idempotencyKey: params.idempotencyKey,
      now,
    });

    const finalized = await this.persistenceRepository.finalizeRuleExecution(tx, {
      locked,
      summary: execution.summary,
      expectedVersion: params.expectedVersion,
      adminId: params.adminId,
      idempotencyKey: params.idempotencyKey,
      meta: params.meta,
      now,
    });

    return {
      ...finalized,
      ...execution,
    };
  }

  private async forceExecuteScheduledConversionInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      conversionId: string;
      expectedVersion: number;
      adminId: string;
      idempotencyKey: string;
      meta: RequestMeta;
    },
  ): Promise<ExchangeScheduledExecutionResult> {
    const locked = await this.persistenceRepository.lockScheduledExecutionRow(tx, params.conversionId);
    if (!locked || locked.deleted_at) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }
    if (deriveVersion(locked.updated_at) !== params.expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, locked.updated_at));
    }
    if (!this.isScheduledForceExecutable(locked.status)) {
      if (locked.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
        throw new ConflictException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_EXECUTED);
      }
      if (locked.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
        throw new ConflictException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_CANCELLED);
      }
      throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
    }
    if (
      !(await this.persistenceRepository.tryActionLock(tx, `exchange_scheduled_force_execute:${params.conversionId}`))
    ) {
      throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
    }

    const now = new Date();
    const execution = await this.executeScheduledConversion(tx, locked, {
      adminId: params.adminId,
      idempotencyKey: params.idempotencyKey,
      now,
    });

    const finalized = await this.persistenceRepository.finalizeScheduledExecution(tx, {
      locked,
      summary: execution.summary,
      expectedVersion: params.expectedVersion,
      adminId: params.adminId,
      idempotencyKey: params.idempotencyKey,
      meta: params.meta,
      now,
    });

    return {
      ...finalized,
      ...execution,
    };
  }

  private async executeRuleConversion(
    tx: Prisma.TransactionClient,
    rule: LockedRuleExecutionRow,
    params: { source: string; actorId: string; idempotencyKey: string; now: Date },
  ) {
    const available = await this.lockedBalance(tx, rule.consumer_id, rule.from_currency);
    const targetBalance = Number(rule.target_balance);
    let amountToConvert = available - targetBalance;

    if (available <= targetBalance) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: `balance_below_target`,
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }

    if (rule.max_convert_amount != null) {
      amountToConvert = Math.min(amountToConvert, Number(rule.max_convert_amount));
    }

    if (!Number.isFinite(amountToConvert) || amountToConvert <= 0) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: `no_amount_to_convert`,
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }

    try {
      const conversion = await this.conversionExecutor.executeInTransaction(tx, {
        consumerId: rule.consumer_id,
        fromCurrency: rule.from_currency,
        toCurrency: rule.to_currency,
        amount: amountToConvert,
        now: params.now,
        createdBy: adminIdOrConsumer(rule.consumer_id, params.actorId),
        updatedBy: adminIdOrConsumer(rule.consumer_id, params.actorId),
        idempotencyKeyPrefix: params.idempotencyKey,
        metadata: {
          source: params.source,
          ruleId: rule.id,
          initiatedBy: params.actorId,
        },
      });

      return {
        executionState: `executed` as const,
        summary: this.buildExecutionSummary({
          status: `executed`,
          reason: `conversion_executed`,
          executedAt: params.now,
          ledgerId: conversion.ledgerId,
          targetAmount: conversion.targetAmount.toString(),
          sourceAmount: amountToConvert.toFixed(getCurrencyFractionDigits(rule.from_currency)),
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    } catch (error) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: this.mapExecutionFailureReason(error),
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }
  }

  private async executeScheduledConversion(
    tx: Prisma.TransactionClient,
    conversion: LockedScheduledExecutionRow,
    params: { adminId: string; idempotencyKey: string; now: Date },
  ) {
    try {
      const result = await this.conversionExecutor.executeInTransaction(tx, {
        consumerId: conversion.consumer_id,
        fromCurrency: conversion.from_currency,
        toCurrency: conversion.to_currency,
        amount: Number(conversion.amount),
        now: params.now,
        createdBy: params.adminId,
        updatedBy: params.adminId,
        idempotencyKeyPrefix: params.idempotencyKey,
        metadata: {
          source: `admin_scheduled_force_execute`,
          initiatedBy: params.adminId,
          scheduledConversionId: conversion.id,
          ruleId: parseOptionalString(asRecord(conversion.metadata).ruleId),
        },
      });

      return {
        executionState: `executed` as const,
        summary: this.buildExecutionSummary({
          status: `executed`,
          reason: `conversion_executed`,
          executedAt: params.now,
          ledgerId: result.ledgerId,
          targetAmount: result.targetAmount.toString(),
          sourceAmount: conversion.amount.toString(),
          source: `admin_scheduled_force_execute`,
          actorId: params.adminId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    } catch (error) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: this.mapExecutionFailureReason(error),
          executedAt: params.now,
          source: `admin_scheduled_force_execute`,
          actorId: params.adminId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }
  }

  private buildExecutionSummary(params: {
    status: ExchangeExecutionState;
    reason: string;
    executedAt: Date;
    ledgerId?: string | null;
    targetAmount?: string | null;
    sourceAmount?: string | null;
    source: string;
    actorId?: string | null;
    idempotencyKey?: string | null;
  }): ExchangeExecutionSummary {
    return {
      status: params.status,
      reason: params.reason,
      executedAt: params.executedAt.toISOString(),
      ledgerId: params.ledgerId ?? null,
      targetAmount: params.targetAmount ?? null,
      sourceAmount: params.sourceAmount ?? null,
      source: params.source,
      actorId: params.actorId ?? null,
      idempotencyKey: params.idempotencyKey ?? null,
    };
  }

  private mapExecutionFailureReason(error: unknown) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === `string`) {
        return response;
      }
      if (response && typeof response === `object` && `message` in response) {
        const message = (response as { message?: unknown }).message;
        if (typeof message === `string`) {
          return message;
        }
        if (Array.isArray(message) && typeof message[0] === `string`) {
          return message[0];
        }
      }
      return error.message;
    }

    return error instanceof Error ? error.message : `Unknown error`;
  }

  private async lockedBalance(tx: Prisma.TransactionClient, consumerId: string, currency: $Enums.CurrencyCode) {
    return this.balanceService.calculateInTransaction(tx, consumerId, currency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  }

  private isScheduledForceExecutable(status: $Enums.ScheduledFxConversionStatus) {
    return (
      status === $Enums.ScheduledFxConversionStatus.PENDING || status === $Enums.ScheduledFxConversionStatus.FAILED
    );
  }

  private async publishRuleEvent(adminId: string, ruleId: string, version: number, summary: ExchangeExecutionSummary) {
    const event: AdminV2DomainEvent = {
      eventType: summary.status === `executed` ? `exchange.executed` : `exchange.failed`,
      timestamp: new Date().toISOString(),
      actorId: adminId,
      resourceType: `exchange_rule`,
      resourceId: ruleId,
      producerVersion: version,
      metadata: {
        reason: summary.reason,
        ledgerId: summary.ledgerId ?? null,
        sourceAmount: summary.sourceAmount ?? null,
        targetAmount: summary.targetAmount ?? null,
      },
    };
    await this.domainEvents.publishAfterCommit(event);
  }
}
