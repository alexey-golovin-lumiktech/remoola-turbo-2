import { IBaseModel } from '../common'
import { AccountTypeValue, ContractorKindValue } from '../shared-types'

export interface IConsumerModel extends IBaseModel {
  email: string
  verified: boolean
  accountType: AccountTypeValue

  contractorKind?: ContractorKindValue
  password?: string
  salt?: string
  firstName?: string
  lastName?: string
  stripeCustomerId?: string

  // refs
  googleProfileDetailsId?: string
  personalDetailsId?: string
  addressDetailsId?: string
  organizationDetailsId?: string
}
