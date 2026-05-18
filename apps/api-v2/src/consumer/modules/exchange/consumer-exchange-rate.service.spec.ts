import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type ConsumerExchangeRateReader } from './consumer-exchange-rate.reader';
import { ConsumerExchangeRateService } from './consumer-exchange-rate.service';

describe(`ConsumerExchangeRateService`, () => {
  function buildService() {
    const rateReader = {
      getRate: jest.fn(async (from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) => {
        if (from === $Enums.CurrencyCode.GBP && to === $Enums.CurrencyCode.AUD) {
          throw new NotFoundException(errorCodes.RATE_NOT_AVAILABLE);
        }
        if (from === $Enums.CurrencyCode.USD && to === $Enums.CurrencyCode.GBP) {
          throw new BadRequestException(errorCodes.RATE_STALE);
        }
        if (from === $Enums.CurrencyCode.EUR && to === $Enums.CurrencyCode.JPY) {
          return { rate: 161.2345 };
        }
        return { rate: 0.95 };
      }),
    };

    return {
      rateReader,
      service: new ConsumerExchangeRateService(rateReader as unknown as ConsumerExchangeRateReader),
    };
  }

  it(`delegates live rate lookup and preserves rate errors outside batch mode`, async () => {
    const { rateReader, service } = buildService();

    await expect(service.getRate($Enums.CurrencyCode.USD, $Enums.CurrencyCode.EUR)).resolves.toEqual({ rate: 0.95 });
    await expect(service.getRate($Enums.CurrencyCode.GBP, $Enums.CurrencyCode.AUD)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getRate($Enums.CurrencyCode.USD, $Enums.CurrencyCode.GBP)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(rateReader.getRate).toHaveBeenCalledWith($Enums.CurrencyCode.USD, $Enums.CurrencyCode.EUR);
  });

  it(`returns batch partial success rows for unavailable and stale pairs`, async () => {
    const { service } = buildService();

    const result = await service.getRatesBatch([
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR },
      { from: $Enums.CurrencyCode.GBP, to: $Enums.CurrencyCode.AUD },
      { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.GBP },
    ]);

    expect(result).toEqual({
      data: [
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, rate: 0.95 },
        { from: $Enums.CurrencyCode.GBP, to: $Enums.CurrencyCode.AUD, code: errorCodes.RATE_NOT_AVAILABLE },
        { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.GBP, code: errorCodes.RATE_STALE },
      ],
    });
  });

  it(`keeps quote multiplication and target-currency rounding`, async () => {
    const { service } = buildService();

    await expect(
      service.quote({ from: $Enums.CurrencyCode.EUR, to: $Enums.CurrencyCode.JPY, amount: 12.345 }),
    ).resolves.toEqual({
      from: $Enums.CurrencyCode.EUR,
      to: $Enums.CurrencyCode.JPY,
      rate: 161.2345,
      sourceAmount: 12.345,
      targetAmount: 1990,
    });
  });

  it(`returns all currency codes with symbols`, () => {
    const { service } = buildService();

    expect(service.getCurrencies()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: $Enums.CurrencyCode.USD, symbol: `$` }),
        expect.objectContaining({ code: $Enums.CurrencyCode.EUR, symbol: `€` }),
      ]),
    );
  });
});
