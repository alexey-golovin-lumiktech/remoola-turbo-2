import { type $Enums } from '@remoola/database-2';

import type { IBaseModel } from './base.model';

export type IExchangeRateModel = {
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  rate: number;
  rateBid?: number | null;
  rateAsk?: number | null;
  spreadBps?: number | null;
  status?: $Enums.ExchangeRateStatus;
  effectiveAt?: Date;
  expiresAt?: Date | null;
  fetchedAt?: Date | null;
  provider?: string | null;
  providerRateId?: string | null;
  confidence?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
} & IBaseModel;
