import { InvoiceStatus } from '../shared-types'

import { IBaseModel } from './base'

export interface IInvoiceModel extends IBaseModel {
  creatorId: string
  refererId: string
  charges: number
  tax: number
  description?: string
  status: InvoiceStatus
}
