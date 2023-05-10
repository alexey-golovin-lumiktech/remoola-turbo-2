export * from './admin.model'
export * from './consumer.model'
export * from './googleProfile.model'

export const TableName = {
  Admins: `admins`,
  GoogleProfiles: `google_profiles`,
  Consumers: `consumers`
} as const
