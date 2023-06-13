export * from './admin.model'
export * from './billing-details.mode'
export * from './consumer.model'
export * from './google-profile.model'
export * from './invoice.model'
export * from './invoice-item.model'

export const TABLE_NAME = {
  Admins: `admins`,
  GoogleProfiles: `google_profiles`,
  Consumers: `consumers`,
  BillingDetails: `billing_details`,
  Invoices: `invoices`,
  InvoiceItems: `invoice_items`,
} as const
export type TableName = ValueOf<typeof TABLE_NAME>
