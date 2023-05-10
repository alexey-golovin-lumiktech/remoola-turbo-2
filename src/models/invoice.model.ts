import { BaseModel, IBaseModel } from './base'

export interface IInvoiceModel extends IBaseModel {
  creatorId: string
  refererId: string
}

export class InvoiceModel extends BaseModel implements IInvoiceModel {
  creatorId: string
  refererId: string
}
