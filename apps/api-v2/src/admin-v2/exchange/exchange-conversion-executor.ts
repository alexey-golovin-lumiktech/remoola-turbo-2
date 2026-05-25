import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { AdminExchangeConversionPersistenceRepository } from './admin-exchange-conversion-persistence.repository';
import { envs } from '../../envs';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { getCurrencyFractionDigits } from '../../shared-common';

type ExchangeConversionParams = {
  consumerId: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  amount: number;
  now: Date;
  createdBy: string;
  updatedBy: string;
  idempotencyKeyPrefix: string;
  metadata: Record<string, unknown>;
};

type ExchangeConversionResult = {
  ledgerId: string;
  entryId: string;
  targetAmount: number;
};

function getRateReferenceAt(rate: { fetchedAt?: Date | null; effectiveAt: Date; createdAt: Date }) {
  return rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
}

@Injectable()
export class ExchangeConversionExecutor {
  constructor(
    private readonly persistenceRepository: AdminExchangeConversionPersistenceRepository,
    private readonly balanceService: BalanceCalculationService,
  ) {}

  async executeInTransaction(
    tx: Prisma.TransactionClient,
    params: ExchangeConversionParams,
  ): Promise<ExchangeConversionResult> {
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

    const available = await this.lockedBalance(tx, params.consumerId, params.fromCurrency);
    if (params.amount > available) {
      throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
    }

    const rate = Number(rateRow.rate);
    const converted = this.roundToCurrency(params.amount * rate, params.toCurrency);
    const ledgerId = newUuid();
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

  private async lockedBalance(tx: Prisma.TransactionClient, consumerId: string, currency: $Enums.CurrencyCode) {
    return this.balanceService.calculateInTransaction(tx, consumerId, currency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
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
