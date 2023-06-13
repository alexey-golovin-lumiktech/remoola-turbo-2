import { IBaseModel } from '../common'
import { AccountType, ContractorKind } from '../shared-types'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean
  accountType: AccountType

  contractorKind?: ContractorKind
  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  stripeCustomerId?: string
}
