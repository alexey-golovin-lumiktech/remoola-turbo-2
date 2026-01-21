import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConvertCurrencyBody } from './dto/convert.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerExchangeService {
  constructor(private readonly prisma: PrismaService) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    if (from === to) return { rate: 1 };

    const rate = await this.prisma.exchangeRateModel.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        deletedAt: null,
      },
    });

    if (!rate) throw new NotFoundException(`Rate not available`);

    return { rate: Number(rate.rate) };
  }

  async getBalanceByCurrency(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`],
      where: {
        consumerId,
        status: $Enums.TransactionStatus.COMPLETED, // 👈 only settled funds
      },
      _sum: {
        amount: true,
      },
    });

    const result: Record<$Enums.CurrencyCode, number> = {} as any;

    for (const row of rows) {
      result[row.currencyCode] = Number(row._sum.amount ?? 0);
    }

    return result;
  }

  async convert(consumerId: string, body: ConvertCurrencyBody) {
    const { amount, from, to } = body;

    if (from === to) {
      throw new BadRequestException(`Cannot convert into same currency`);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(`Invalid amount`);
    }

    const balances = await this.getBalanceByCurrency(consumerId);
    const available = balances[from] ?? 0;

    if (amount > available) {
      throw new BadRequestException(`Insufficient ${from} balance`);
    }

    const rate = await this.getRate(from, to);
    const converted = Number((amount * rate.rate).toFixed(2));

    const ledgerId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Source currency — money leaves
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: from,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: -amount, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          metadata: {
            from,
            to,
            rate: rate.rate,
          },
        },
      });

      // 2️⃣ Target currency — money enters
      const income = await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: to,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: +converted, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          metadata: {
            from,
            to,
            rate: rate.rate,
          },
        },
      });

      return {
        from,
        to,
        rate: rate.rate,
        sourceAmount: amount,
        targetAmount: converted,
        ledgerId,
        entryId: income.id,
      };
    });
  }
}
