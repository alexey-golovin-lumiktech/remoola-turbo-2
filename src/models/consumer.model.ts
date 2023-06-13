import { IBaseModel } from '../common'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean

  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  middleName?: string
  stripeCustomerId?: string
}
