import { IBaseModel, BaseModel } from './base'

export interface IUserModel extends IBaseModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}

export class UserModel extends BaseModel implements IUserModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}
