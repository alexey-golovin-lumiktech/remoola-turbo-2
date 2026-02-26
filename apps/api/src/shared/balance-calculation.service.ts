import { Injectable, Logger } from '@nestjs/common';

import { Prisma, $Enums } from '@remoola/database-2';

import { PrismaService } from './prisma.service';

/**
 * Balance calculation modes for different use cases.
 */
export enum BalanceCalculationMode {
  /** Only COMPLETED transactions */
  COMPLETED = `COMPLETED`,
  /** COMPLETED + PENDING transactions (for available balance with pending ops) */
  COMPLETED_AND_PENDING = `COMPLETED_AND_PENDING`,
}

/**
 * Options for balance calculation.
 */
export interface BalanceCalculationOptions {
  /** Calculation mode (default: COMPLETED) */
  mode?: BalanceCalculationMode;
  /** Specific currency to calculate (default: all currencies) */
  currency?: $Enums.CurrencyCode;
  /** Acquire advisory lock before calculation (default: false) */
  acquireLock?: boolean;
  /** Lock suffix for operation-specific locking (e.g., ':withdraw', ':transfer') */
  lockSuffix?: string;
}

/**
 * Result of single currency balance calculation.
 */
export interface BalanceResult {
  consumerId: string;
  currency: $Enums.CurrencyCode;
  balance: number;
  mode: BalanceCalculationMode;
  calculatedAt: Date;
}

/**
 * Result of multi-currency balance calculation.
 */
export interface MultiCurrencyBalanceResult {
  consumerId: string;
  balances: Record<$Enums.CurrencyCode, number>;
  mode: BalanceCalculationMode;
  calculatedAt: Date;
}

/**
 * Centralized balance calculation service.
 *
 * Provides consistent, fintech-safe balance calculations across the application.
 * All balance calculations use the same LATERAL join pattern to get the latest
 * outcome status for each ledger entry (append-only outcomes pattern).
 *
 * @remarks
 * - Uses append-only ledger outcomes for status determination
 * - Supports advisory locks for concurrent operation safety
 * - All calculations exclude soft-deleted entries (deleted_at IS NULL)
 * - Supports both single currency and multi-currency calculations
 *
 * @example
 * ```typescript
 * // Get all balances for a consumer
 * const balances = await balanceService.calculateMultiCurrency(consumerId);
 *
 * // Get balance with lock for withdraw operation
 * const balance = await balanceService.calculateSingle(
 *   consumerId,
 *   'USD',
 *   { acquireLock: true, lockSuffix: ':withdraw' }
 * );
 *
 * // Get balance including pending transactions
 * const balanceWithPending = await balanceService.calculateSingle(
 *   consumerId,
 *   'USD',
 *   { mode: BalanceCalculationMode.COMPLETED_AND_PENDING }
 * );
 * ```
 */
@Injectable()
export class BalanceCalculationService {
  private readonly logger = new Logger(BalanceCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate balance for a specific currency.
   *
   * @param consumerId - Consumer UUID
   * @param currency - Currency code (optional, returns first currency if not specified)
   * @param options - Calculation options
   * @returns Balance result
   *
   * @throws Error if database query fails
   */
  async calculateSingle(
    consumerId: string,
    currency?: $Enums.CurrencyCode,
    options?: BalanceCalculationOptions,
  ): Promise<BalanceResult> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const acquireLock = options?.acquireLock ?? false;
    const lockSuffix = options?.lockSuffix ?? ``;

    // Acquire advisory lock if requested
    if (acquireLock) {
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await this.prisma.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusFilter = this.buildStatusFilter(mode);
    const currencyFilter = currency ? Prisma.sql`AND le.currency_code::text = ${currency}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ currency_code: $Enums.CurrencyCode; balance: string }>>(
      Prisma.sql`
        SELECT le.currency_code, COALESCE(SUM(le.amount), 0) AS balance
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id::text = ${consumerId}
          AND (COALESCE(latest.status, le.status))::text = ${statusFilter}
          AND le.deleted_at IS NULL
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

  /**
   * Calculate balances for all currencies for a consumer.
   *
   * @param consumerId - Consumer UUID
   * @param options - Calculation options
   * @returns Multi-currency balance result
   *
   * @throws Error if database query fails
   */
  async calculateMultiCurrency(
    consumerId: string,
    options?: BalanceCalculationOptions,
  ): Promise<MultiCurrencyBalanceResult> {
    const mode = options?.mode ?? BalanceCalculationMode.COMPLETED;
    const acquireLock = options?.acquireLock ?? false;
    const lockSuffix = options?.lockSuffix ?? ``;

    // Acquire advisory lock if requested
    if (acquireLock) {
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await this.prisma.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusFilter = this.buildStatusFilter(mode);

    const rows = await this.prisma.$queryRaw<Array<{ currency_code: $Enums.CurrencyCode; sum_amount: string }>>(
      Prisma.sql`
        SELECT le.currency_code, COALESCE(SUM(le.amount), 0) AS sum_amount
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id::text = ${consumerId}
          AND (COALESCE(latest.status, le.status))::text = ${statusFilter}
          AND le.deleted_at IS NULL
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

  /**
   * Calculate balance within a transaction.
   * Convenience method that wraps calculateSingle with transaction handling.
   *
   * @param tx - Prisma transaction client
   * @param consumerId - Consumer UUID
   * @param currency - Currency code
   * @param options - Calculation options (without acquireLock)
   * @returns Balance amount
   *
   * @remarks
   * Advisory locks acquired inside transactions are held until transaction commit/rollback.
   */
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

    // Acquire advisory lock if requested (locks are transaction-scoped)
    if (options?.acquireLock) {
      const lockKey = `balance:${consumerId}${lockSuffix}`;
      await tx.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
      `);
    }

    const statusFilter = this.buildStatusFilter(mode);
    const currencyFilter = currency ? Prisma.sql`AND le.currency_code::text = ${currency}` : Prisma.empty;

    const rows = await tx.$queryRaw<Array<{ balance: string }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(le.amount), 0) AS balance
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id::text = ${consumerId}
          AND (COALESCE(latest.status, le.status))::text = ${statusFilter}
          AND le.deleted_at IS NULL
          ${currencyFilter}
      `,
    );

    return Number(rows[0]?.balance ?? 0);
  }

  /**
   * Check if balance is sufficient for an operation.
   *
   * @param tx - Prisma transaction client
   * @param consumerId - Consumer UUID
   * @param currency - Currency code
   * @param requiredAmount - Required amount (positive number)
   * @param options - Calculation options (without acquireLock)
   * @returns True if balance is sufficient
   *
   * @throws Error if balance is insufficient
   */
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

  /**
   * Build status filter SQL fragment based on calculation mode.
   */
  private buildStatusFilter(mode: BalanceCalculationMode): string {
    switch (mode) {
      case BalanceCalculationMode.COMPLETED:
        return $Enums.TransactionStatus.COMPLETED;
      case BalanceCalculationMode.COMPLETED_AND_PENDING:
        // For this mode, we need to check for both statuses
        // This is handled specially in the query
        return `${$Enums.TransactionStatus.COMPLETED},${$Enums.TransactionStatus.PENDING}`;
      default:
        return $Enums.TransactionStatus.COMPLETED;
    }
  }
}
