import { type IExchangeRateModel } from '../models/exchange-rate.model';
import { type WithoutDeletedAt } from '../types';

export type IExchangeRateResponse = WithoutDeletedAt<IExchangeRateModel>;
