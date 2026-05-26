import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';

import { roundConsumerExchangeAmountToCurrencyDecimal } from './consumer-exchange-normalizers';
import { toMoneyDecimal } from '../../../shared/money-decimal.utils';
import { PrismaService } from '../../../shared/prisma.service';

function readRateFromMetadata(metadata: unknown): Prisma.Decimal | undefined {
  if (!metadata || typeof metadata !== `object`) return undefined;
  const raw = (metadata as Record<string, unknown>).rate;
  if (typeof raw !== `number` && typeof raw !== `string`) return undefined;
  try {
    return toMoneyDecimal(raw, `metadata rate`);
  } catch {
    return undefined;
  }
}

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

    const amountDecimal = toMoneyDecimal(amount, `exchange amount`);
    const rateDecimal = toMoneyDecimal(rate, `exchange rate`);

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
        const rateFromMetadata = readRateFromMetadata(existingTarget.metadata);
        return {
          from,
          to,
          rate: (rateFromMetadata ?? rateDecimal).toNumber(),
          sourceAmount: amountDecimal.toNumber(),
          targetAmount: toMoneyDecimal(existingTarget.amount, `existing target amount`).toNumber(),
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
          const sourceAmountDecimal = toMoneyDecimal(existingSource.amount, `existing source amount`).abs();

          if (targetInsideTx) {
            const rateFromMetadata = readRateFromMetadata(targetInsideTx.metadata) ?? rateDecimal;
            return {
              from,
              to,
              rate: rateFromMetadata.toNumber(),
              sourceAmount: sourceAmountDecimal.toNumber(),
              targetAmount: toMoneyDecimal(targetInsideTx.amount, `existing target amount`).toNumber(),
              ledgerId: targetInsideTx.ledgerId,
              entryId: targetInsideTx.id,
            };
          }

          const sourceMetadata = (existingSource.metadata ?? {}) as Record<string, unknown>;
          const rateFromMetadataDecimal = readRateFromMetadata(sourceMetadata) ?? rateDecimal;
          const mergedMetadata = {
            ...sourceMetadata,
            ...(metadata as Record<string, unknown>),
            from,
            to,
            rate: rateFromMetadataDecimal.toString(),
          } as Prisma.InputJsonValue;
          const targetAmountDecimal = roundConsumerExchangeAmountToCurrencyDecimal(
            sourceAmountDecimal.times(rateFromMetadataDecimal),
            to,
          );

          try {
            const income = await tx.ledgerEntryModel.create({
              data: {
                ledgerId: existingSource.ledgerId,
                consumerId,
                type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
                currencyCode: to,
                status: $Enums.TransactionStatus.COMPLETED,
                amount: targetAmountDecimal,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: targetIdempotencyKey,
                metadata: mergedMetadata,
              },
            });

            return {
              from,
              to,
              rate: rateFromMetadataDecimal.toNumber(),
              sourceAmount: sourceAmountDecimal.toNumber(),
              targetAmount: targetAmountDecimal.toNumber(),
              ledgerId: income.ledgerId,
              entryId: income.id,
            };
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
              const existing = await tx.ledgerEntryModel.findFirst({
                where: { idempotencyKey: targetIdempotencyKey, consumerId },
              });
              if (existing) {
                const existingRate = readRateFromMetadata(existing.metadata) ?? rateDecimal;
                return {
                  from,
                  to,
                  rate: existingRate.toNumber(),
                  sourceAmount: sourceAmountDecimal.toNumber(),
                  targetAmount: toMoneyDecimal(existing.amount, `existing target amount`).toNumber(),
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

    const ledgerId = newUuid();
    const targetAmountDecimal = roundConsumerExchangeAmountToCurrencyDecimal(amountDecimal.times(rateDecimal), to);
    const sourceAmountSignedDecimal = amountDecimal.negated();
    const metadataWithStringRate = {
      ...((metadata as Record<string, unknown>) ?? {}),
      rate: rateDecimal.toString(),
    } as Prisma.InputJsonValue;

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
          amount: sourceAmountSignedDecimal,
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: sourceIdempotencyKey,
          metadata: metadataWithStringRate,
        },
      });

      const income = await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: to,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: targetAmountDecimal,
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: targetIdempotencyKey,
          metadata: metadataWithStringRate,
        },
      });

      return {
        from,
        to,
        rate: rateDecimal.toNumber(),
        sourceAmount: amountDecimal.toNumber(),
        targetAmount: targetAmountDecimal.toNumber(),
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
