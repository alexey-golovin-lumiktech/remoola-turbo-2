import { InvoiceStatus } from '@wirebill/back-and-front'

import { InvoiceItem } from '../dtos/admin'

import { IBaseModel } from './base'

export interface IInvoiceModel extends IBaseModel {
  metadata?: string

  creatorId: string
  refererId: string
  status: InvoiceStatus
  currency?: string //default usd
  tax?: number //default 1
  subtotal: number // in cents
  total: number // in cents
  items?: InvoiceItem[]

  // stripe
  stripeInvoiceId?: string
  hostedInvoiceUrl?: string
  invoicePdf?: string
}
