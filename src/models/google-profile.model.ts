import { BaseModel, IBaseModel } from './base'

export interface IGoogleProfileModel extends IBaseModel {
  consumersId: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
  familyName: string
  picture: string
  organization: string
}

export class GoogleProfileModel extends BaseModel implements IGoogleProfileModel {
  consumersId: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
  familyName: string
  picture: string
  organization: string
}
