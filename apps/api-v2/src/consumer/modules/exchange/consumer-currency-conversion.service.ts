import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerExchangeExecutionRepository } from './consumer-exchange-execution.repository';
import { ConsumerExchangeRateService } from './consumer-exchange-rate.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';

@Injectable()
export class ConsumerCurrencyConversionService {
  private readonly logger = new Logger(ConsumerCurrencyConversionService.name);

  constructor(
    private readonly balanceService: BalanceCalculationService,
    private readonly rateService: ConsumerExchangeRateService,
    private readonly executionRepository: ConsumerExchangeExecutionRepository,
  ) {}

  async convert(consumerId: string, body: ConvertCurrencyBody) {
    try {
      return this.convertInternal(consumerId, body, {
        metadata: { source: `manual` },
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Currency conversion failed`, {
        consumerId,
        from: body.from,
        to: body.to,
        amount: body.amount,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async convertInternal(
    consumerId: string,
    body: ConvertCurrencyBody,
    options?: {
      metadata?: Record<string, unknown>;
      idempotencyKeyPrefix?: string;
    },
  ) {
    try {
      const { amount, from, to } = body;

      if (from === to) {
        throw new BadRequestException(errorCodes.CANNOT_CONVERT_SAME_CURRENCY);
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(errorCodes.INVALID_AMOUNT_CONVERT);
      }

      const rate = await this.rateService.getRate(from, to);
      const idempotencyKeyPrefix = options?.idempotencyKeyPrefix;
      return await this.executionRepository.executeExchange({
        consumerId,
        from,
        to,
        amount,
        rate: rate.rate,
        metadata: { from, to, rate: rate.rate, ...(options?.metadata ?? {}) },
        sourceIdempotencyKey: idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:source` : undefined,
        targetIdempotencyKey: idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:target` : undefined,
        assertSufficientBalance: async (tx) => {
          const balanceInsideTx = await this.balanceService.calculateInTransaction(tx, consumerId, from, {
            mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
          });
          if (amount > balanceInsideTx) {
            throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
          }
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Currency conversion internal failed`, {
        consumerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
