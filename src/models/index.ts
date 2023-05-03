export * from './admin.model'
export * from './googleProfile.model'
export * from './user.model'

export const TableName = {
  Admins: `admins`,
  GoogleProfiles: `google_profiles`,
  Users: `users`
} as const
