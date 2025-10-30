/* eslint-disable simple-import-sort/imports */
import type { CurrencyCodeValue } from '../types'
import type { IBaseModel } from './base.model'

export type IExchangeRateModel = {
  fromCurrency: CurrencyCodeValue
  toCurrency: CurrencyCodeValue
  rate: number
} & IBaseModel
