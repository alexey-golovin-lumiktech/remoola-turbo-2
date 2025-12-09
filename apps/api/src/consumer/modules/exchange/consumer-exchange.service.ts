import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConvertCurrencyBody } from './dto/convert.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerExchangeService {
  constructor(private readonly prisma: PrismaService) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    if (from === to) return { rate: 1 };

    const rate = await this.prisma.exchangeRateModel.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    });

    if (!rate) throw new NotFoundException(`Rate not available`);

    return { rate: Number(rate.rate) };
  }

  async getBalanceByCurrency(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const transactions = await this.prisma.transactionModel.findMany({
      where: { consumerId },
    });

    const map: Record<$Enums.CurrencyCode, number> = {} as any;

    for (const tx of transactions) {
      const amount = Number(tx.originAmount);
      const cur = tx.currencyCode;

      if (!map[cur]) map[cur] = 0;

      if (tx.actionType === $Enums.TransactionActionType.INCOME) {
        if (tx.status === $Enums.TransactionStatus.COMPLETED || tx.status === $Enums.TransactionStatus.WAITING) {
          map[cur] += amount;
        }
      } else {
        if (tx.status === $Enums.TransactionStatus.COMPLETED || tx.status === $Enums.TransactionStatus.PENDING) {
          map[cur] -= amount;
        }
      }
    }

    return map;
  }

  async convert(consumerId: string, body: ConvertCurrencyBody) {
    if (body.from === body.to) {
      throw new BadRequestException(`Cannot convert into same currency`);
    }

    const { amount, from, to } = body;

    const balances = await this.getBalanceByCurrency(consumerId);
    const available = balances[from] ?? 0;

    if (amount > available) {
      throw new BadRequestException(`Insufficient ${from} balance`);
    }

    const rate = await this.getRate(from, to);
    const converted = Number((amount * rate.rate).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      // OUTCOME in source currency
      await tx.transactionModel.create({
        data: {
          consumerId,
          type: $Enums.TransactionType.CURRENCY_EXCHANGE,
          currencyCode: from,
          actionType: $Enums.TransactionActionType.OUTCOME,
          status: $Enums.TransactionStatus.COMPLETED,
          originAmount: amount,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      // INCOME in target currency
      const income = await tx.transactionModel.create({
        data: {
          consumerId,
          type: $Enums.TransactionType.CURRENCY_EXCHANGE,
          currencyCode: to,
          actionType: $Enums.TransactionActionType.INCOME,
          status: $Enums.TransactionStatus.COMPLETED,
          originAmount: converted,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      return {
        from,
        to,
        rate: rate.rate,
        sourceAmount: amount,
        targetAmount: converted,
        transactionId: income.id,
      };
    });
  }
}
