import { Injectable } from '@nestjs/common';

import { Prisma, $Enums } from '@remoola/database-2';

import { buildWalletEligibilityCondition } from './balance-calculation.sql';
import { parseRawFiniteNumber, sqlRequiredUuid } from './prisma-raw.utils';
import { PrismaService } from './prisma.service';

type BalanceMode = `COMPLETED` | `COMPLETED_AND_PENDING`;
type BalanceClient = Pick<Prisma.TransactionClient, `$executeRaw` | `$queryRaw`>;
type SingleBalanceRow = { currency_code: unknown; balance: unknown };
type MultiBalanceRow = { currency_code: unknown; sum_amount: unknown };

function parseCurrencyCode(value: unknown): $Enums.CurrencyCode {
  if (typeof value === `string` && Object.values($Enums.CurrencyCode).includes(value as $Enums.CurrencyCode)) {
    return value as $Enums.CurrencyCode;
  }

  throw new Error(`balance row currency_code must be a known currency`);
}

@Injectable()
export class BalanceCalculationRepository {
  constructor(private readonly prisma: PrismaService) {}

  acquireBalanceLock(client: BalanceClient, consumerId: string, lockSuffix = ``) {
    const lockKey = `balance:${consumerId}${lockSuffix}`;
    return client.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text)::bigint)
    `);
  }

  async calculateSingleBalance(
    client: Pick<BalanceClient, `$queryRaw`>,
    params: {
      consumerId: string;
      mode: BalanceMode;
      currency?: $Enums.CurrencyCode;
    },
  ) {
    const statusCondition = this.buildStatusCondition(params.mode);
    const currencyFilter = params.currency ? Prisma.sql`AND le.currency_code::text = ${params.currency}` : Prisma.empty;
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await client.$queryRaw<SingleBalanceRow[]>(Prisma.sql`
      SELECT le.currency_code, COALESCE(SUM(le.amount), 0)::text AS balance
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id = ${sqlRequiredUuid(params.consumerId, `consumerId`)}
        ${statusCondition}
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
        ${currencyFilter}
      GROUP BY le.currency_code
    `);

    const result = rows[0];
    return {
      currency: result ? parseCurrencyCode(result.currency_code) : (params.currency ?? $Enums.CurrencyCode.USD),
      balance: result ? parseRawFiniteNumber(result.balance, `balance`) : 0,
    };
  }

  async calculateMultiCurrencyBalances(
    client: Pick<BalanceClient, `$queryRaw`>,
    params: {
      consumerId: string;
      mode: BalanceMode;
    },
  ) {
    const statusCondition = this.buildStatusCondition(params.mode);
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await client.$queryRaw<MultiBalanceRow[]>(Prisma.sql`
      SELECT le.currency_code, COALESCE(SUM(le.amount), 0)::text AS sum_amount
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id = ${sqlRequiredUuid(params.consumerId, `consumerId`)}
        ${statusCondition}
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
      GROUP BY le.currency_code
    `);

    const balances: Partial<Record<$Enums.CurrencyCode, number>> = {};
    for (const row of rows) {
      balances[parseCurrencyCode(row.currency_code)] = parseRawFiniteNumber(row.sum_amount, `sum_amount`);
    }
    return balances as Record<$Enums.CurrencyCode, number>;
  }

  async calculateBalanceInTransaction(
    tx: Pick<BalanceClient, `$queryRaw`>,
    params: {
      consumerId: string;
      currency: $Enums.CurrencyCode;
      mode: BalanceMode;
    },
  ) {
    const statusCondition = this.buildStatusCondition(params.mode);
    const currencyFilter = Prisma.sql`AND le.currency_code::text = ${params.currency}`;
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await tx.$queryRaw<Array<{ balance: unknown }>>(Prisma.sql`
      SELECT COALESCE(SUM(le.amount), 0)::text AS balance
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id = ${sqlRequiredUuid(params.consumerId, `consumerId`)}
        ${statusCondition}
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
        ${currencyFilter}
    `);

    return rows[0] ? parseRawFiniteNumber(rows[0].balance, `balance`) : 0;
  }

  client() {
    return this.prisma;
  }

  private buildStatusCondition(mode: BalanceMode): Prisma.Sql {
    switch (mode) {
      case `COMPLETED_AND_PENDING`:
        return Prisma.sql`
          AND (COALESCE(latest.status, le.status))::text
          IN (${$Enums.TransactionStatus.COMPLETED}, ${$Enums.TransactionStatus.PENDING})
        `;
      case `COMPLETED`:
      default:
        return Prisma.sql`AND (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED}`;
    }
  }
}
