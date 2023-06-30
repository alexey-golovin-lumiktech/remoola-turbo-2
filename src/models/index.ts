import { OneOfObjectValues } from '../shared-types/common.types'

export * from './admin.model'
export * from './consumer.model'
export * from './google-profile.model'
export * from './personal-details.model'
export * from './address-details.model'
export * from './organization-details.model'
export * from './billing-details.mode'
export * from './payment-request.model'

export type TableNameValue = OneOfObjectValues<typeof TableName>
export const TableName = {
  Admin: `admin`,
  Consumer: `consumer`,
  PersonalDetails: `personal_details`,
  AddressDetails: `address_details`,
  OrganizationDetails: `organization_details`,
  GoogleProfileDetails: `google_profile_details`,
  BillingDetails: `billing_details`,
  PaymentRequest: `payment_request`,
} as const
