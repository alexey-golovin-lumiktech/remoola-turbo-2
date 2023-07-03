import { IBaseModel } from './base.model'

export interface IGoogleProfileModel extends IBaseModel {
  consumerId: string
  emailVerified: boolean
  data: string //JSONB all g-profile data

  email?: string
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
  organization?: string
}
