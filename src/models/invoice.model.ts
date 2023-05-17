import { IBaseModel } from './base'

import { InvoiceStatus } from 'src/shared-types'

export interface IInvoiceModel extends IBaseModel {
  creatorId: string
  refererId: string
  charges: number
  tax: number
  description?: string
  status: InvoiceStatus
}
