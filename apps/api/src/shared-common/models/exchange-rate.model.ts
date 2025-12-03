import { type $Enums } from '@remoola/database';

import type { IBaseModel } from './base.model';

export type IExchangeRateModel = {
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  rate: number;
} & IBaseModel;
