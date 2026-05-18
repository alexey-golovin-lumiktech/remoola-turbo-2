import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { AdminExchangeActionLockRepository } from './admin-exchange-action-lock.repository';
import {
  AdminScheduledConversionPersistenceRepository,
  type ExchangeScheduledExecutionResult,
  type LockedScheduledExecutionRow,
} from './admin-scheduled-conversion-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { ExchangeConversionExecutor } from './exchange-conversion-executor';
import { buildExchangeExecutionSummary, mapExchangeExecutionFailureReason } from './exchange-execution-summary';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2DomainEvent, AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
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

@Injectable()
export class AdminScheduledConversionCommandsService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly domainEvents: AdminV2DomainEventsService,
    private readonly conversionExecutor: ExchangeConversionExecutor,
    private readonly preflightRepository: AdminV2ExchangePreflightRepository,
    private readonly actionLockRepository: AdminExchangeActionLockRepository,
    private readonly persistenceRepository: AdminScheduledConversionPersistenceRepository,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

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
      await this.publishScheduledExecutionEvent(adminId, conversionId, result.version, result.summary);
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

  private async assertActiveScheduledConversionVersion(conversionId: string, expectedVersion: number) {
    const conversion = await this.preflightRepository.findActiveScheduledConversionById(conversionId);
    if (!conversion) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }
    if (deriveVersion(conversion.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, conversion.updatedAt));
    }
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
      !(await this.actionLockRepository.tryActionLock(tx, `exchange_scheduled_force_execute:${params.conversionId}`))
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
        summary: buildExchangeExecutionSummary({
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
        summary: buildExchangeExecutionSummary({
          status: `failed`,
          reason: mapExchangeExecutionFailureReason(error),
          executedAt: params.now,
          source: `admin_scheduled_force_execute`,
          actorId: params.adminId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }
  }

  private isScheduledForceExecutable(status: $Enums.ScheduledFxConversionStatus) {
    return (
      status === $Enums.ScheduledFxConversionStatus.PENDING || status === $Enums.ScheduledFxConversionStatus.FAILED
    );
  }

  private async publishScheduledExecutionEvent(
    adminId: string,
    conversionId: string,
    version: number,
    summary: ExchangeScheduledExecutionResult[`summary`],
  ) {
    const event: AdminV2DomainEvent = {
      eventType: `exchange.executed`,
      timestamp: new Date().toISOString(),
      actorId: adminId,
      resourceType: `scheduled_fx_conversion`,
      resourceId: conversionId,
      producerVersion: version,
      metadata: {
        status: summary.status,
        reason: summary.reason,
        ledgerId: summary.ledgerId ?? null,
      },
    };
    await this.domainEvents.publishAfterCommit(event);
  }
}
