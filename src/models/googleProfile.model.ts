import { IBaseModel, BaseModel } from './base'

export interface IGoogleProfileModel extends IBaseModel {
  userId: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
  familyName: string
  picture: string
  organization: string
}

export class GoogleProfileModel extends BaseModel implements IGoogleProfileModel {
  userId: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
  familyName: string
  picture: string
  organization: string
}
