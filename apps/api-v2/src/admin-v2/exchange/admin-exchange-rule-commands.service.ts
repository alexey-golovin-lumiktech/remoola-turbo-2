import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { AdminExchangeActionLockRepository } from './admin-exchange-action-lock.repository';
import {
  buildExecutedRuleExecution,
  buildFailedRuleExecution,
  buildFailedRuleExecutionFromError,
  buildRuleExecutionEvent,
  decideAmountToConvert,
} from './admin-exchange-rule-execution-helpers';
import {
  AdminExchangeRulePersistenceRepository,
  type ExchangeRuleExecutionResult,
  type LockedRuleExecutionRow,
} from './admin-exchange-rule-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { ExchangeConversionExecutor } from './exchange-conversion-executor';
import { type ExchangeExecutionSummary } from './exchange-execution-summary';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';
import { AdminV2DomainEventsService } from '../admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

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
export class AdminExchangeRuleCommandsService {
  constructor(
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly domainEvents: AdminV2DomainEventsService,
    private readonly balanceService: BalanceCalculationService,
    private readonly conversionExecutor: ExchangeConversionExecutor,
    private readonly preflightRepository: AdminV2ExchangePreflightRepository,
    private readonly actionLockRepository: AdminExchangeActionLockRepository,
    private readonly persistenceRepository: AdminExchangeRulePersistenceRepository,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

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

  private async assertActiveRuleVersion(ruleId: string, expectedVersion: number) {
    const rule = await this.preflightRepository.findActiveRuleById(ruleId);
    if (!rule) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }
    if (deriveVersion(rule.updatedAt) !== expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
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
    if (!(await this.actionLockRepository.tryActionLock(tx, `exchange_rule_run_now:${params.ruleId}`))) {
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

  private async executeRuleConversion(
    tx: Prisma.TransactionClient,
    rule: LockedRuleExecutionRow,
    params: { source: string; actorId: string; idempotencyKey: string; now: Date },
  ) {
    const available = await this.lockedBalance(tx, rule.consumer_id, rule.from_currency);
    const amountDecision = decideAmountToConvert(available, rule.target_balance, rule.max_convert_amount);

    if (amountDecision.kind === `failed`) {
      return buildFailedRuleExecution(params, amountDecision.reason);
    }

    try {
      const conversion = await this.conversionExecutor.executeInTransaction(tx, {
        consumerId: rule.consumer_id,
        fromCurrency: rule.from_currency,
        toCurrency: rule.to_currency,
        amount: amountDecision.amountToConvert,
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

      return buildExecutedRuleExecution(params, rule.from_currency, amountDecision.amountToConvert, conversion);
    } catch (error) {
      return buildFailedRuleExecutionFromError(params, error);
    }
  }

  private async lockedBalance(tx: Prisma.TransactionClient, consumerId: string, currency: $Enums.CurrencyCode) {
    return this.balanceService.calculateInTransaction(tx, consumerId, currency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  }

  private async publishRuleEvent(adminId: string, ruleId: string, version: number, summary: ExchangeExecutionSummary) {
    const event = buildRuleExecutionEvent(adminId, ruleId, version, summary);
    await this.domainEvents.publishAfterCommit(event);
  }
}
