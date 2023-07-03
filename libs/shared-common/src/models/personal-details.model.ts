import { IBaseModel } from './base.model'

export interface IPersonalDetailsModel extends IBaseModel {
  consumerId: string
  citizenOf: string
  dateOfBirth: string
  passportOrIdNumber: string

  countryOfTaxResidence?: string
  legalStatus?: string
  taxId?: string
  phoneNumber?: string
}
