import { AccountTypeValue, ContractorKindValue } from '../types'

import { IBaseModel } from './base.model'

export interface IConsumerModel extends IBaseModel {
  accountType?: AccountTypeValue
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
