/* eslint-disable simple-import-sort/imports */
import type { HowDidHearAboutUsValue, AccountTypeValue, ContractorKindValue } from '../types'

import type { IBaseModel } from './base.model'

export type IConsumerModel = {
  email: string
  verified: boolean
  legalVerified: boolean

  password?: string
  salt?: string
  firstName?: string
  lastName?: string

  howDidHearAboutUs?: string | HowDidHearAboutUsValue
  accountType?: AccountTypeValue
  contractorKind?: ContractorKindValue
  stripeCustomerId?: string

  googleProfileDetailsId?: string
  personalDetailsId?: string
  addressDetailsId?: string
  organizationDetailsId?: string
} & IBaseModel
