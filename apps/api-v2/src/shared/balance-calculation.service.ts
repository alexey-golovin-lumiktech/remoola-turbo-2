import { Injectable } from '@nestjs/common';

import { Prisma, $Enums } from '@remoola/database-2';

import { sqlUuid } from './prisma-raw.utils';
import { PrismaService } from './prisma.service';

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

/** Exclude external card-funded legs and unsettled credits from wallet spendable balance. */
export function buildWalletEligibilityCondition(): Prisma.Sql {
  const railSql = Prisma.sql`COALESCE(NULLIF(le.metadata->>'rail', ''), pr.payment_rail::text, '')`;
  return Prisma.sql`
    AND NOT (
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT}
        AND le.amount < 0
        AND ${railSql} = ${$Enums.PaymentRail.CARD}
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT}
        AND le.amount > 0
        AND ${railSql} = ${$Enums.PaymentRail.CARD}
        AND COALESCE(latest.status, le.status)::text <> ${$Enums.TransactionStatus.COMPLETED}
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL}
        AND le.amount > 0
        AND (
          ${railSql} = ${$Enums.PaymentRail.STRIPE_REFUND}
          OR ${railSql} = ${$Enums.PaymentRail.STRIPE_CHARGEBACK}
        )
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT}
        AND le.amount > 0
        AND COALESCE(latest.status, le.status)::text <> ${$Enums.TransactionStatus.COMPLETED}
      )
    )
  `;
}

@Injectable()
export class BalanceCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateSingle(
    consumerId: string,
    currency?: $Enums.CurrencyCode,
    options?: BalanceCalculationOptions,
  ): Promise<BalanceResult> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const acquireLock = options?.acquireLock ?? false;
    const lockSuffix = options?.lockSuffix ?? ``;

    if (acquireLock) {
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await this.prisma.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusCondition = this.buildStatusCondition(mode);
    const currencyFilter = currency ? Prisma.sql`AND le.currency_code::text = ${currency}` : Prisma.empty;
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await this.prisma.$queryRaw<Array<{ currency_code: $Enums.CurrencyCode; balance: string }>>(
      Prisma.sql`
        SELECT le.currency_code, COALESCE(SUM(le.amount), 0) AS balance
        FROM ledger_entry le
        LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id = ${sqlUuid(consumerId)}
          ${statusCondition}
          AND le.deleted_at IS NULL
          ${walletEligibilityCondition}
          ${currencyFilter}
        GROUP BY le.currency_code
      `,
    );

    const result = rows[0];
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
      currency: result.currency_code,
      balance: Number(result.balance),
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
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await this.prisma.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusCondition = this.buildStatusCondition(mode);
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await this.prisma.$queryRaw<Array<{ currency_code: $Enums.CurrencyCode; sum_amount: string }>>(
      Prisma.sql`
        SELECT le.currency_code, COALESCE(SUM(le.amount), 0) AS sum_amount
        FROM ledger_entry le
        LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id = ${sqlUuid(consumerId)}
          ${statusCondition}
          AND le.deleted_at IS NULL
          ${walletEligibilityCondition}
        GROUP BY le.currency_code
      `,
    );

    const balances: Partial<Record<$Enums.CurrencyCode, number>> = {};
    for (const row of rows) {
      balances[row.currency_code] = Number(row.sum_amount);
    }

    return {
      consumerId,
      balances: balances as Record<$Enums.CurrencyCode, number>,
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
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusCondition = this.buildStatusCondition(mode);
    const currencyFilter = currency ? Prisma.sql`AND le.currency_code::text = ${currency}` : Prisma.empty;
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await tx.$queryRaw<Array<{ balance: string }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(le.amount), 0) AS balance
        FROM ledger_entry le
        LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id = ${sqlUuid(consumerId)}
          ${statusCondition}
          AND le.deleted_at IS NULL
          ${walletEligibilityCondition}
          ${currencyFilter}
      `,
    );

    return Number(rows[0]?.balance ?? 0);
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

  private buildStatusCondition(mode: BalanceCalculationMode): Prisma.Sql {
    switch (mode) {
      case BalanceCalculationMode.COMPLETED_AND_PENDING:
        return Prisma.sql`
          AND (COALESCE(latest.status, le.status))::text
          IN (${$Enums.TransactionStatus.COMPLETED}, ${$Enums.TransactionStatus.PENDING})
        `;
      case BalanceCalculationMode.COMPLETED:
      default:
        return Prisma.sql`AND (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED}`;
    }
  }
}
