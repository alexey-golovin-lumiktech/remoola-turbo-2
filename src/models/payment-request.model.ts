import { IBaseModel } from '../common'
import { CurrencyCodeValue, PaymentStatusValue, TransactionTypeValue } from '../shared-types'

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
