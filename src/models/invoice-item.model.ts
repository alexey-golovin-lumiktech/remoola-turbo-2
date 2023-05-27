import { IBaseModel } from './base'

export interface IInvoiceItemModel extends IBaseModel {
  invoiceId: string
  description: string
  currency: string
  amount: number
  metadata?: string
}
