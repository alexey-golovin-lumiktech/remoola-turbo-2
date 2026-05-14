import { randomUUID } from 'crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { envs } from '../../envs';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { getCurrencyFractionDigits } from '../../shared-common';
import { type AdminV2DomainEvent, AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  AdminV2ExchangePersistenceRepository,
  type LockedRuleExecutionRow as LockedRuleRow,
  type LockedScheduledExecutionRow as LockedScheduledRow,
} from './admin-v2-exchange-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { AdminV2ExchangeTransactionRunner } from './admin-v2-exchange-transaction.runner';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type RuleExecutionStatus = `executed` | `failed`;

type RuleExecutionSummary = {
  status: RuleExecutionStatus;
  reason: string;
  executedAt: string;
  ledgerId?: string | null;
  targetAmount?: string | null;
  sourceAmount?: string | null;
  idempotencyKey?: string | null;
  source: string;
  actorId?: string | null;
};

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
}

function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
}

function buildStaleVersionPayload(resourceLabel: string, currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `${resourceLabel} has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
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

function getRateReferenceAt(rate: { fetchedAt?: Date | null; effectiveAt: Date; createdAt: Date }) {
  return rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
}

function adminIdOrConsumer(consumerId: string, adminId: string | null | undefined) {
  return adminId ?? consumerId;
}

@Injectable()
export class AdminV2ExchangeCommandsService {
  constructor(
    private readonly transactions: AdminV2ExchangeTransactionRunner,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly balanceService: BalanceCalculationService,
    private readonly domainEvents: AdminV2DomainEventsService,
    private readonly preflightRepository: AdminV2ExchangePreflightRepository,
    private readonly persistenceRepository: AdminV2ExchangePersistenceRepository,
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
        const rate = await this.preflightRepository.findActiveRateById(rateId);

        if (!rate) {
          throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
        }

        if (deriveVersion(rate.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rate`, rate.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          return this.persistenceRepository.approveDraftRate(tx, {
            rateId,
            expectedVersion,
            adminId,
            reason,
            meta,
          });
        });
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
        const rule = await this.preflightRepository.findActiveRuleById(ruleId);

        if (!rule) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(rule.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          return this.persistenceRepository.setRuleEnabled(tx, {
            ruleId,
            expectedVersion,
            adminId,
            enabled: false,
            meta,
          });
        });
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
        const rule = await this.preflightRepository.findActiveRuleById(ruleId);

        if (!rule) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(rule.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          return this.persistenceRepository.setRuleEnabled(tx, {
            ruleId,
            expectedVersion,
            adminId,
            enabled: true,
            meta,
          });
        });
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
        const preflight = await this.preflightRepository.findActiveRuleById(ruleId);

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, preflight.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          const locked = await this.persistenceRepository.lockRuleExecutionRow(tx, ruleId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
          }
          if (!(await this.persistenceRepository.tryActionLock(tx, `exchange_rule_run_now:${ruleId}`))) {
            throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
          }

          const now = new Date();
          const execution = await this.executeRuleConversion(tx, locked, {
            source: `admin_rule_run`,
            actorId: adminId,
            idempotencyKey,
            now,
          });

          const finalized = await this.persistenceRepository.finalizeRuleExecution(tx, {
            locked,
            summary: execution.summary,
            expectedVersion,
            adminId,
            idempotencyKey,
            meta,
            now,
          });

          return {
            ...finalized,
            ...execution,
          };
        });
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
        const preflight = await this.preflightRepository.findActiveScheduledConversionById(conversionId);

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, preflight.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          const locked = await this.persistenceRepository.lockScheduledExecutionRow(tx, conversionId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
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
            !(await this.persistenceRepository.tryActionLock(tx, `exchange_scheduled_force_execute:${conversionId}`))
          ) {
            throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
          }

          const now = new Date();
          const execution = await this.executeScheduledConversion(tx, locked, {
            adminId,
            idempotencyKey,
            now,
          });

          const finalized = await this.persistenceRepository.finalizeScheduledExecution(tx, {
            locked,
            summary: execution.summary,
            expectedVersion,
            adminId,
            idempotencyKey,
            meta,
            now,
          });

          return {
            ...finalized,
            ...execution,
          };
        });
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
        const preflight = await this.preflightRepository.findActiveScheduledConversionById(conversionId);

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, preflight.updatedAt));
        }

        return this.transactions.run(async (tx) => {
          return this.persistenceRepository.cancelScheduledConversion(tx, {
            conversionId,
            expectedVersion,
            adminId,
            meta,
          });
        });
      },
    });
  }

  private async publishRuleEvent(adminId: string, ruleId: string, version: number, summary: RuleExecutionSummary) {
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

  private async executeRuleConversion(
    tx: Prisma.TransactionClient,
    rule: LockedRuleRow,
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
      const conversion = await this.executeConversionInTransaction(tx, {
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
    conversion: LockedScheduledRow,
    params: { adminId: string; idempotencyKey: string; now: Date },
  ) {
    try {
      const result = await this.executeConversionInTransaction(tx, {
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
    status: RuleExecutionStatus;
    reason: string;
    executedAt: Date;
    ledgerId?: string | null;
    targetAmount?: string | null;
    sourceAmount?: string | null;
    source: string;
    actorId?: string | null;
    idempotencyKey?: string | null;
  }): RuleExecutionSummary {
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

  private async executeConversionInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      consumerId: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      amount: number;
      now: Date;
      createdBy: string;
      updatedBy: string;
      idempotencyKeyPrefix: string;
      metadata: Record<string, unknown>;
    },
  ) {
    if (params.fromCurrency === params.toCurrency) {
      throw new BadRequestException(errorCodes.CANNOT_CONVERT_SAME_CURRENCY);
    }

    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_CONVERT);
    }

    await this.persistenceRepository.acquireConversionAdvisoryLock(tx, params.consumerId);

    const rateRow = await this.persistenceRepository.findApprovedRateForConversion(
      tx,
      params.fromCurrency,
      params.toCurrency,
      params.now,
    );
    if (!rateRow) {
      throw new NotFoundException(errorCodes.RATE_NOT_AVAILABLE);
    }

    const referenceAt = getRateReferenceAt(rateRow);
    if (referenceAt.getTime() < this.getRateStaleCutoff(params.now).getTime()) {
      throw new BadRequestException(errorCodes.RATE_STALE);
    }

    const available = await this.balanceService.calculateInTransaction(tx, params.consumerId, params.fromCurrency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
    if (params.amount > available) {
      throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
    }

    const rate = Number(rateRow.rate);
    const converted = this.roundToCurrency(params.amount * rate, params.toCurrency);
    const ledgerId = randomUUID();
    const sourceKey = `${params.idempotencyKeyPrefix}:source`;
    const targetKey = `${params.idempotencyKeyPrefix}:target`;
    const metadata = {
      from: params.fromCurrency,
      to: params.toCurrency,
      rate,
      rateId: rateRow.id,
      ...params.metadata,
    };
    const { entryId } = await this.persistenceRepository.createConversionLedgerEntries(tx, {
      ledgerId,
      consumerId: params.consumerId,
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      sourceAmount: params.amount,
      targetAmount: converted,
      createdBy: params.createdBy,
      updatedBy: params.updatedBy,
      sourceIdempotencyKey: sourceKey,
      targetIdempotencyKey: targetKey,
      metadata,
    });

    return {
      ledgerId,
      entryId,
      targetAmount: converted,
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

  private roundToCurrency(amount: number, currency: $Enums.CurrencyCode) {
    const digits = getCurrencyFractionDigits(currency);
    return Number(amount.toFixed(digits));
  }

  private getMaxRateAgeMs() {
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    if (!Number.isFinite(hours) || hours <= 0) {
      return 24 * 60 * 60 * 1000;
    }
    return hours * 60 * 60 * 1000;
  }

  private getRateStaleCutoff(now: Date) {
    return new Date(now.getTime() - this.getMaxRateAgeMs());
  }
}
