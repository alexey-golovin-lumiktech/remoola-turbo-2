import { IBaseModel } from '../common'
import { PaymentStatusValue, TransactionTypeValue } from '../shared-types'

export interface IPaymentRequestModel extends IBaseModel {
  requesterId: string
  payerId: string
  amount: number
  dueBy: Date
  sentDate: Date
  transactionType: TransactionTypeValue
  status: PaymentStatusValue
  taxId: string
}
