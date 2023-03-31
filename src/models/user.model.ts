import { IBaseModel } from './base'

export enum UserType {
  Super = `super`,
  Admin = `admin`,
  User = `user`
}

export interface IUserModel extends IBaseModel {
  email: string

  userType: UserType
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}

export class UserModel implements IUserModel {
  id: string
  email: string

  userType: UserType
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
