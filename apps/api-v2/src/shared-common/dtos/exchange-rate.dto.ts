import { type IExchangeRateModel } from '../models/exchange-rate.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IExchangeRateResponse = WithoutDeletedAt<IExchangeRateModel>;
export type IExchangeRateCreate = OnlyUpsertFields<WithoutDeletedAt<IExchangeRateModel>>;
export type IExchangeRateUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IExchangeRateModel>>>;
