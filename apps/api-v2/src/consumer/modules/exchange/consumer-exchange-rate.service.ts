import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import {
  getConsumerExchangeCurrencySymbol,
  getConsumerExchangeRateBatchErrorCode,
  roundConsumerExchangeAmountToCurrency,
} from './consumer-exchange-normalizers';
import { ConsumerExchangeRateReader } from './consumer-exchange-rate.reader';
import { ConvertCurrencyBody } from './dto/convert.dto';

@Injectable()
export class ConsumerExchangeRateService {
  constructor(private readonly rateReader: ConsumerExchangeRateReader) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    return this.rateReader.getRate(from, to);
  }

  async quote(body: ConvertCurrencyBody) {
    const rate = await this.getRate(body.from, body.to);
    const targetAmount = roundConsumerExchangeAmountToCurrency(body.amount * rate.rate, body.to);
    return {
      from: body.from,
      to: body.to,
      rate: rate.rate,
      sourceAmount: body.amount,
      targetAmount,
    };
  }

  async getRatesBatch(pairs: { from: $Enums.CurrencyCode; to: $Enums.CurrencyCode }[]) {
    const results = await Promise.all(
      pairs.map(async (pair) => {
        try {
          const rate = await this.getRate(pair.from, pair.to);
          return { from: pair.from, to: pair.to, rate: rate.rate };
        } catch (error) {
          if (error instanceof BadRequestException || error instanceof NotFoundException) {
            return {
              from: pair.from,
              to: pair.to,
              code: getConsumerExchangeRateBatchErrorCode(error),
            };
          }
          throw error;
        }
      }),
    );
    return { data: results };
  }

  getCurrencies() {
    return Object.values($Enums.CurrencyCode).map((code) => ({
      code,
      symbol: getConsumerExchangeCurrencySymbol(code),
    }));
  }
}
