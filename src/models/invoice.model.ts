import { IBaseModel } from './base'

import { ValueOf } from 'src/shared-types'

export const invoiceStatus = { paid: `paid`, due: `due`, canceled: `canceled` } as const
export const invoiceStatuses = Object.values(invoiceStatus)
export type InvoiceStatus = ValueOf<typeof invoiceStatus>

export interface IInvoiceModel extends IBaseModel {
  creator: string
  referer: string
  charges: number
  tax: number
  description?: string
  status: InvoiceStatus
}
