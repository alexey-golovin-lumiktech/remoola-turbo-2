import { BaseModel, IBaseModel } from './base'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean

  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  middleName?: string

  googleProfileId?: string //relation
  billingDetailsId?: string //relation
  addressId?: string //relation
}

export class ConsumerModel extends BaseModel implements IConsumerModel {
  email: string
  verified: boolean

  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  middleName?: string

  googleProfileId?: string //relation
  billingDetailsId?: string //relation
  addressId?: string //relation
}
