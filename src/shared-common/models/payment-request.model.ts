import type { CurrencyCodeValue, TransactionStatusValue, TransactionTypeValue } from '../types'

import type { IBaseModel } from './base.model'

/* record is created when the request is created */
export type IPaymentRequestModel = {
  requesterId: string // consumer_id
  payerId: string // consumer_id
  amount: number // in cents
  currencyCode: CurrencyCodeValue
  description: string
  type: TransactionTypeValue
  status: TransactionStatusValue // ( status is changed by the admin depending on the status of the transaction)

  dueDate: Date
  sentDate: Date
  expectationDate: Date

  createdBy: string
  updatedBy: string
  deletedBy?: string
} & IBaseModel
