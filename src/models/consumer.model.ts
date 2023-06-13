import { AccountType } from 'src/shared-types'

import { IBaseModel } from '../common'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean
  accountType: AccountType

  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  stripeCustomerId?: string
}
