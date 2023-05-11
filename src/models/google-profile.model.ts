import { BaseModel, IBaseModel } from './base'

export interface IGoogleProfileModel extends IBaseModel {
  consumerId: string
  emailVerified: boolean

  email: string | null
  name: string | null
  givenName: string | null
  familyName: string | null
  picture: string | null
  organization: string | null

  data: string //JSONB all g-profile data
}

export class GoogleProfileModel extends BaseModel implements IGoogleProfileModel {
  consumerId: string
  emailVerified: boolean

  email: string | null
  name: string | null
  givenName: string | null
  familyName: string | null
  picture: string | null
  organization: string | null
  data: string
}
