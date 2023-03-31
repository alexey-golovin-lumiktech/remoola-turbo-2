import { IBaseModel } from './base'

export enum UserType {
  Super = `super`,
  Admin = `admin`,
  User = `user`
}

export interface IUserModel extends IBaseModel {
  id: string
  email: string
  firstName: string
  lastName: string
  middleName: string
  userType: UserType

  verified: boolean

  password: string
  passwordHash: string
  passwordSalt: string

  googleProfileId: string

  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null // soft delete
}

export class UserModel implements IUserModel {
  id: string
  email: string
  firstName: string
  lastName: string
  middleName: string
  userType: UserType

  verified: boolean

  password: string
  passwordHash: string
  passwordSalt: string

  googleProfileId: string

  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
