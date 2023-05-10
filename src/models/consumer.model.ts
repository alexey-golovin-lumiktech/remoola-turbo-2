import { BaseModel, IBaseModel } from './base'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}

export class ConsumerModel extends BaseModel implements IConsumerModel {
  email: string
  verified: boolean
  password: string
  salt: string

  googleProfileId?: string
  firstName?: string
  lastName?: string
  middleName?: string
}
