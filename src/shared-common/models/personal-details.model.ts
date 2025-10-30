/* eslint-disable simple-import-sort/imports */
import type { LegalStatusValue } from '../types'
import type { IBaseModel } from './base.model'

export type IPersonalDetailsModel = {
  citizenOf: string
  dateOfBirth: Date
  passportOrIdNumber: string

  legalStatus?: LegalStatusValue // only for contractors
  countryOfTaxResidence?: string
  taxId?: string
  phoneNumber?: string
} & IBaseModel
