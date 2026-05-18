import { type Cache } from 'cache-manager';

import { $Enums } from '@remoola/database-2';

import { ConsumerExchangeRateQuery } from './consumer-exchange-rate.query';
import { type PrismaService } from '../../../shared/prisma.service';

describe(`ConsumerExchangeRateQuery`, () => {
  function buildQuery() {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const prisma = {
      exchangeRateModel: {
        findFirst: jest.fn(),
      },
    };

    return {
      cacheManager,
      prisma,
      query: new ConsumerExchangeRateQuery(cacheManager as unknown as Cache, prisma as unknown as PrismaService),
    };
  }

  it(`returns a cached approved exchange rate without hitting the database`, async () => {
    const { cacheManager, prisma, query } = buildQuery();
    const rate = { id: `rate-1`, expiresAt: null };
    cacheManager.get.mockResolvedValue(rate);

    await expect(
      query.findApprovedEffectiveRate(
        $Enums.CurrencyCode.USD,
        $Enums.CurrencyCode.EUR,
        new Date(`2026-05-18T12:00:00Z`),
      ),
    ).resolves.toBe(rate);

    expect(cacheManager.get).toHaveBeenCalledWith(`consumer-exchange-rate:approved:USD:EUR`);
    expect(prisma.exchangeRateModel.findFirst).not.toHaveBeenCalled();
  });

  it(`caches a database rate only until the earlier of default TTL or rate expiry`, async () => {
    const { cacheManager, prisma, query } = buildQuery();
    const now = new Date(`2026-05-18T12:00:00Z`);
    const rate = { id: `rate-1`, expiresAt: new Date(now.getTime() + 5_000) };
    cacheManager.get.mockResolvedValue(undefined);
    prisma.exchangeRateModel.findFirst.mockResolvedValue(rate);

    await expect(query.findApprovedEffectiveRate($Enums.CurrencyCode.USD, $Enums.CurrencyCode.EUR, now)).resolves.toBe(
      rate,
    );

    expect(cacheManager.set).toHaveBeenCalledWith(`consumer-exchange-rate:approved:USD:EUR`, rate, 5_000);
  });

  it(`does not cache a missing rate`, async () => {
    const { cacheManager, prisma, query } = buildQuery();
    cacheManager.get.mockResolvedValue(undefined);
    prisma.exchangeRateModel.findFirst.mockResolvedValue(null);

    await expect(
      query.findApprovedEffectiveRate(
        $Enums.CurrencyCode.USD,
        $Enums.CurrencyCode.EUR,
        new Date(`2026-05-18T12:00:00Z`),
      ),
    ).resolves.toBeNull();

    expect(cacheManager.set).not.toHaveBeenCalled();
  });
});
