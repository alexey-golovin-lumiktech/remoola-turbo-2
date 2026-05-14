import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { roundConsumerExchangeAmountToCurrency } from './consumer-exchange-normalizers';
import { PrismaService } from '../../../shared/prisma.service';

type ExchangeExecutionResult = {
  from: $Enums.CurrencyCode;
  to: $Enums.CurrencyCode;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  ledgerId: string;
  entryId: string;
};

type ExecuteExchangeParams = {
  consumerId: string;
  from: $Enums.CurrencyCode;
  to: $Enums.CurrencyCode;
  amount: number;
  rate: number;
  metadata: Prisma.InputJsonValue;
  sourceIdempotencyKey?: string;
  targetIdempotencyKey?: string;
  assertSufficientBalance: (tx: Prisma.TransactionClient) => Promise<void>;
};

@Injectable()
export class ConsumerExchangeExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async executeExchange(params: ExecuteExchangeParams): Promise<ExchangeExecutionResult> {
    const {
      consumerId,
      from,
      to,
      amount,
      rate,
      metadata,
      sourceIdempotencyKey,
      targetIdempotencyKey,
      assertSufficientBalance,
    } = params;

    if (sourceIdempotencyKey || targetIdempotencyKey) {
      const [existingTarget, existingSource] = await Promise.all([
        this.prisma.ledgerEntryModel.findFirst({
          where: { idempotencyKey: targetIdempotencyKey, consumerId },
        }),
        this.prisma.ledgerEntryModel.findFirst({
          where: { idempotencyKey: sourceIdempotencyKey, consumerId },
        }),
      ]);

      if (existingTarget) {
        const existingMetadata = (existingTarget.metadata ?? {}) as Record<string, unknown>;
        const rateFromMetadata = typeof existingMetadata.rate === `number` ? existingMetadata.rate : undefined;
        return {
          from,
          to,
          rate: rateFromMetadata ?? rate,
          sourceAmount: amount,
          targetAmount: Number(existingTarget.amount),
          ledgerId: existingTarget.ledgerId,
          entryId: existingTarget.id,
        };
      }

      if (existingSource) {
        return this.prisma.$transaction(async (tx) => {
          await this.acquireExchangeLock(tx, consumerId);

          const targetInsideTx = await tx.ledgerEntryModel.findFirst({
            where: { idempotencyKey: targetIdempotencyKey, consumerId },
          });
          if (targetInsideTx) {
            const targetMetadata = (targetInsideTx.metadata ?? {}) as Record<string, unknown>;
            const rateFromMetadata = typeof targetMetadata.rate === `number` ? targetMetadata.rate : rate;
            return {
              from,
              to,
              rate: rateFromMetadata,
              sourceAmount: Math.abs(Number(existingSource.amount)),
              targetAmount: Number(targetInsideTx.amount),
              ledgerId: targetInsideTx.ledgerId,
              entryId: targetInsideTx.id,
            };
          }

          const sourceMetadata = (existingSource.metadata ?? {}) as Record<string, unknown>;
          const rateFromMetadata = typeof sourceMetadata.rate === `number` ? sourceMetadata.rate : rate;
          const mergedMetadata = {
            ...sourceMetadata,
            ...(metadata as Record<string, unknown>),
            from,
            to,
            rate: rateFromMetadata,
          } as Prisma.InputJsonValue;
          const sourceAmount = Math.abs(Number(existingSource.amount));
          const targetAmount = roundConsumerExchangeAmountToCurrency(sourceAmount * rateFromMetadata, to);

          try {
            const income = await tx.ledgerEntryModel.create({
              data: {
                ledgerId: existingSource.ledgerId,
                consumerId,
                type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
                currencyCode: to,
                status: $Enums.TransactionStatus.COMPLETED,
                amount: +targetAmount,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: targetIdempotencyKey,
                metadata: mergedMetadata,
              },
            });

            return {
              from,
              to,
              rate: rateFromMetadata,
              sourceAmount,
              targetAmount,
              ledgerId: income.ledgerId,
              entryId: income.id,
            };
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
              const existing = await tx.ledgerEntryModel.findFirst({
                where: { idempotencyKey: targetIdempotencyKey, consumerId },
              });
              if (existing) {
                const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
                const existingRate = typeof existingMetadata.rate === `number` ? existingMetadata.rate : rate;
                return {
                  from,
                  to,
                  rate: existingRate,
                  sourceAmount,
                  targetAmount: Number(existing.amount),
                  ledgerId: existing.ledgerId,
                  entryId: existing.id,
                };
              }
            }

            throw error;
          }
        });
      }
    }

    const ledgerId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      await this.acquireExchangeLock(tx, consumerId);
      await assertSufficientBalance(tx);

      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: from,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: -amount,
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: sourceIdempotencyKey,
          metadata,
        },
      });

      const income = await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: to,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: +roundConsumerExchangeAmountToCurrency(amount * rate, to),
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: targetIdempotencyKey,
          metadata,
        },
      });

      return {
        from,
        to,
        rate,
        sourceAmount: amount,
        targetAmount: Number(income.amount),
        ledgerId,
        entryId: income.id,
      };
    });
  }

  private async acquireExchangeLock(tx: Prisma.TransactionClient, consumerId: string) {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':exchange')::text)::bigint)
    `);
  }
}
