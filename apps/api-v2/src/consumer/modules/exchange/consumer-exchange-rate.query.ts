import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

const APPROVED_RATE_CACHE_TTL_MS = 60_000;

type ApprovedExchangeRate = Prisma.ExchangeRateModelGetPayload<Prisma.ExchangeRateModelDefaultArgs> | null;

@Injectable()
export class ConsumerExchangeRateQuery {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  async findApprovedEffectiveRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode, now: Date) {
    const cacheKey = this.buildApprovedRateCacheKey(from, to);
    const cached = await this.cacheManager.get<ApprovedExchangeRate>(cacheKey);
    if (cached) {
      return cached;
    }

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

    if (rate) {
      await this.cacheManager.set(cacheKey, rate, this.resolveCacheTtl(rate.expiresAt, now));
    }

    return rate;
  }

  private buildApprovedRateCacheKey(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    return `consumer-exchange-rate:approved:${from}:${to}`;
  }

  private resolveCacheTtl(expiresAt: Date | null, now: Date) {
    if (!expiresAt) {
      return APPROVED_RATE_CACHE_TTL_MS;
    }
    const expiresInMs = expiresAt.getTime() - now.getTime();
    return Math.max(1, Math.min(APPROVED_RATE_CACHE_TTL_MS, expiresInMs));
  }
}
