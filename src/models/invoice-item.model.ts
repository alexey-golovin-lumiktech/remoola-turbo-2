import { IBaseModel } from '../common'

export interface IInvoiceItemModel extends IBaseModel {
  invoiceId: string
  description: string
  currency: string
  amount: number
  metadata?: string
}
