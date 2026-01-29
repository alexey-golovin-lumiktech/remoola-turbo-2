import { type $Enums } from '@remoola/database-2';

import type { IBaseModel } from './base.model';

export type IExchangeRateModel = {
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  rate: number;
} & IBaseModel;
