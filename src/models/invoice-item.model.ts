import { BaseModel, IBaseModel } from './base'

export interface IInvoiceItemModel extends IBaseModel {
  invoiceId: string

  charges: number
  tax: number
  description: string | null
}

export class InvoiceItemModel extends BaseModel implements IInvoiceItemModel {
  invoiceId: string
  charges: number
  tax: number
  description: string | null
}
