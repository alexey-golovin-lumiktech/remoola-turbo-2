import { BaseModel, IBaseModel } from './base'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean

  password: string | null
  salt: string | null
  googleProfileId: string | null
  firstName: string | null
  lastName: string | null
  middleName: string | null
}

export class ConsumerModel extends BaseModel implements IConsumerModel {
  email: string
  verified: boolean

  password: string | null
  salt: string | null
  googleProfileId: string | null
  firstName: string | null
  lastName: string | null
  middleName: string | null
}
