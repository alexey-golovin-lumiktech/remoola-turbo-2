import { Injectable } from '@nestjs/common';

import { type Prisma, $Enums } from '@remoola/database-2';

import { BalanceCalculationRepository } from './balance-calculation.repository';

export enum BalanceCalculationMode {
  COMPLETED = `COMPLETED`,
  COMPLETED_AND_PENDING = `COMPLETED_AND_PENDING`,
}

interface BalanceCalculationOptions {
  mode?: BalanceCalculationMode;
  currency?: $Enums.CurrencyCode;
  acquireLock?: boolean;
  lockSuffix?: string;
}

interface BalanceResult {
  consumerId: string;
  currency: $Enums.CurrencyCode;
  balance: number;
  mode: BalanceCalculationMode;
  calculatedAt: Date;
}

interface MultiCurrencyBalanceResult {
  consumerId: string;
  balances: Record<$Enums.CurrencyCode, number>;
  mode: BalanceCalculationMode;
  calculatedAt: Date;
}

@Injectable()
export class BalanceCalculationService {
  constructor(private readonly repository: BalanceCalculationRepository) {}

  async calculateSingle(
    consumerId: string,
    currency?: $Enums.CurrencyCode,
    options?: BalanceCalculationOptions,
  ): Promise<BalanceResult> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const acquireLock = options?.acquireLock ?? false;
    const lockSuffix = options?.lockSuffix ?? ``;

    if (acquireLock) {
      await this.repository.acquireBalanceLock(this.repository.client(), consumerId, lockSuffix);
    }

    const result = await this.repository.calculateSingleBalance(this.repository.client(), {
      consumerId,
      currency,
      mode,
    });

    if (!result) {
      return {
        consumerId,
        currency: currency || (`USD` as $Enums.CurrencyCode),
        balance: 0,
        mode,
        calculatedAt: new Date(),
      };
    }

    return {
      consumerId,
      currency: result.currency,
      balance: result.balance,
      mode,
      calculatedAt: new Date(),
    };
  }

  async calculateMultiCurrency(
    consumerId: string,
    options?: BalanceCalculationOptions,
  ): Promise<MultiCurrencyBalanceResult> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const acquireLock = options?.acquireLock ?? false;
    const lockSuffix = options?.lockSuffix ?? ``;

    if (acquireLock) {
      await this.repository.acquireBalanceLock(this.repository.client(), consumerId, lockSuffix);
    }

    const balances = await this.repository.calculateMultiCurrencyBalances(this.repository.client(), {
      consumerId,
      mode,
    });

    return {
      consumerId,
      balances,
      mode,
      calculatedAt: new Date(),
    };
  }

  async calculateInTransaction(
    tx: Prisma.TransactionClient,
    consumerId: string,
    currency: $Enums.CurrencyCode,
    options?: {
      mode?: BalanceCalculationMode;
      lockSuffix?: string;
      acquireLock?: boolean;
    },
  ): Promise<number> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const lockSuffix = options?.lockSuffix ?? ``;

    if (options?.acquireLock) {
      await this.repository.acquireBalanceLock(tx, consumerId, lockSuffix);
    }

    return this.repository.calculateBalanceInTransaction(tx, {
      consumerId,
      currency,
      mode,
    });
  }

  async assertSufficientBalance(
    tx: Prisma.TransactionClient,
    consumerId: string,
    currency: $Enums.CurrencyCode,
    requiredAmount: number,
    options?: {
      mode?: BalanceCalculationMode;
      lockSuffix?: string;
      errorMessage?: string;
    },
  ): Promise<boolean> {
    const balance = await this.calculateInTransaction(tx, consumerId, currency, {
      mode: options?.mode,
      lockSuffix: options?.lockSuffix,
    });

    if (balance < requiredAmount) {
      const error = new Error(options?.errorMessage || `Insufficient balance`);
      error.name = `INSUFFICIENT_BALANCE`;
      throw error;
    }

    return true;
  }
}
