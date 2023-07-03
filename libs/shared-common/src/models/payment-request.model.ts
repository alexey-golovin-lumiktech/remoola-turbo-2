import { CurrencyCodeValue, PaymentStatusValue, TransactionTypeValue } from '../types'

import { IBaseModel } from './base.model'

export interface IPaymentRequestModel extends IBaseModel {
  requesterId: string
  payerId: string
  amount: number
  currencyCode: CurrencyCodeValue
  dueBy: Date
  sentDate: Date
  transactionType: TransactionTypeValue
  status: PaymentStatusValue
  taxId: string
}
