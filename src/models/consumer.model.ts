import { IBaseModel } from '../common'
import { AccountTypeValue, ContractorKindValue } from '../shared-types'

export interface IConsumerModel extends IBaseModel {
  accountType: AccountTypeValue
  contractorKind?: ContractorKindValue
  email: string
  verified: boolean
  legalVerified: boolean
  howDidHearAboutUs: string

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
