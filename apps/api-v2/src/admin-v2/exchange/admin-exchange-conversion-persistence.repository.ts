import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminExchangeConversionPersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async acquireConversionAdvisoryLock(tx: Prisma.TransactionClient, consumerId: string) {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':exchange')::text)::bigint)
    `);
  }

  async findApprovedRateForConversion(
    tx: Prisma.TransactionClient,
    fromCurrency: $Enums.CurrencyCode,
    toCurrency: $Enums.CurrencyCode,
    now: Date,
  ) {
    return tx.exchangeRateModel.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        status: $Enums.ExchangeRateStatus.APPROVED,
        deletedAt: null,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
    });
  }

  async createConversionLedgerEntries(
    tx: Prisma.TransactionClient,
    params: {
      ledgerId: string;
      consumerId: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      sourceAmount: number;
      targetAmount: number;
      createdBy: string;
      updatedBy: string;
      sourceIdempotencyKey: string;
      targetIdempotencyKey: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.fromCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -params.sourceAmount,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: params.sourceIdempotencyKey,
        metadata: params.metadata,
      },
    });

    const creditEntry = await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.toCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: params.targetAmount,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: params.targetIdempotencyKey,
        metadata: params.metadata,
      },
    });

    return {
      entryId: creditEntry.id,
    };
  }
}
