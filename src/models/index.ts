export * from './address.model'
export * from './admin.model'
export * from './base'
export * from './billing-details.mode'
export * from './consumer.model'
export * from './google-profile.model'
export * from './invoice.model'
export * from './invoice-item.model'

export const TableName = {
  Admins: `admins`,
  GoogleProfiles: `google_profiles`,
  Consumers: `consumers`,
  Addresses: `addresses`,
  BillingDetails: `billing_details`,
  Invoices: `invoices`,
  InvoiceItems: `invoice_items`
} as const
