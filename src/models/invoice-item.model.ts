import { IBaseModel } from '../common'
import { CurrencyCodeValue } from '../shared-types'

export interface IInvoiceItemModel extends IBaseModel {
  invoiceId: string
  description: string
  currency: CurrencyCodeValue
  amount: number
  metadata?: string
}
