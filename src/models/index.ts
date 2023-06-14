export * from './admin.model'
export * from './consumer.model'
export * from './google-profile.model'
export * from './personal-details.model'
export * from './address-details.model'
export * from './organization-details.model'
export * from './billing-details.mode'
export * from './invoice.model'
export * from './invoice-item.model'

export const TABLE_NAME = {
  Admin: `admin`,
  Consumer: `consumer`,
  PersonalDetails: `personal_details`,
  AddressDetails: `address_details`,
  OrganizationDetails: `organization_details`,
  GoogleProfileDetails: `google_profile_details`,
  BillingDetails: `billing_details`,
  Invoice: `invoice`,
  InvoiceItem: `invoice_item`,
} as const
export type TableName = (typeof TABLE_NAME)[keyof typeof TABLE_NAME]
