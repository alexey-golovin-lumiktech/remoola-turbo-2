import { BaseModel, IBaseModel } from './base'

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

export class GoogleProfileModel extends BaseModel implements IGoogleProfileModel {
  consumerId: string
  emailVerified: boolean
  data: string

  email?: string
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
  organization?: string
}
