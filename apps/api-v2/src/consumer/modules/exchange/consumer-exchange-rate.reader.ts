import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerExchangeRateReader {
  constructor(private readonly prisma: PrismaService) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    if (from === to) return { rate: 1 };

    const now = new Date();
    const rate = await this.prisma.exchangeRateModel.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        status: $Enums.ExchangeRateStatus.APPROVED,
        deletedAt: null,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }],
    });

    if (!rate) throw new NotFoundException(errorCodes.RATE_NOT_AVAILABLE);

    const referenceTime = rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
    if (referenceTime) {
      const maxAgeMs = this.getMaxRateAgeMs();
      if (now.getTime() - referenceTime.getTime() > maxAgeMs) {
        throw new BadRequestException(errorCodes.RATE_STALE);
      }
    }

    const baseRate = Number(rate.rate);
    const effectiveRate =
      rate.rateBid != null
        ? Number(rate.rateBid)
        : rate.spreadBps != null
          ? Number((baseRate * (1 - rate.spreadBps / 10_000)).toFixed(8))
          : baseRate;

    return { rate: effectiveRate };
  }

  private getMaxRateAgeMs() {
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    if (!Number.isFinite(hours) || hours <= 0) {
      return 24 * 60 * 60 * 1000;
    }
    return hours * 60 * 60 * 1000;
  }
}
