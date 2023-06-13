import { IBaseModel } from '../common'
import { InvoiceItem } from '../dtos/admin'
import { InvoiceStatus } from '../shared-types'

export interface IInvoiceModel extends IBaseModel {
  metadata?: string

  creatorId: string
  refererId: string
  status: InvoiceStatus
  currency?: string //default usd
  tax?: number //default 1
  subtotal: number
  total: number
  dueDateInDays: number // default 30
  items?: InvoiceItem[]

  // stripe
  stripeInvoiceId?: string
  hostedInvoiceUrl?: string
  invoicePdf?: string
}
