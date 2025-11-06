import { type CurrencyCode } from '@remoola/database';

import type { IBaseModel } from './base.model';

export type IExchangeRateModel = {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
} & IBaseModel;
