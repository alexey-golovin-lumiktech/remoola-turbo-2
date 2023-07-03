import type { CurrencyCodeValue, PaymentStatusValue, TransactionTypeValue } from '@wirebill/shared-common'

import { IBaseModel } from '../common'

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
