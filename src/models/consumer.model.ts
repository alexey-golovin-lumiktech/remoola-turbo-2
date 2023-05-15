import { IBaseModel } from './base'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean

  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  middleName?: string
}
