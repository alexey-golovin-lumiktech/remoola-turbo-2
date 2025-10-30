import type { OneOfObjectValues } from '../types'

export * from './base.model'
export * from './admin.model'
export * from './consumer.model'
export * from './google-profile-details.model'
export * from './personal-details.model'
export * from './address-details.model'
export * from './organization-details.model'
export * from './billing-details.mode'
export * from './payment-request.model'
export * from './reset-password.model'
export * from './contact.model'
export * from './resource.model'
export * from './consumer-resource.model'
export * from './payment-request-attachment.model'
export * from './transaction.model'
export * from './access-refresh-token.model'
export * from './exchange-rate.model'
export * from './payment-method.model'

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
  ResetPassword: `reset_password`,
  Contact: `contact`,
  Resource: `resource`,
  ConsumerResource: `consumer_resource`,
  PaymentRequestAttachment: `payment_request_attachment`,
  Transaction: `transaction`,
  AccessRefreshToken: `access_refresh_token`,
  ExchangeRate: `exchange_rate`,
  PaymentMethod: `payment_method`,
} as const
