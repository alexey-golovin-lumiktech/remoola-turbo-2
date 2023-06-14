import { IBaseModel } from '../common'

export interface IPersonalDetailsModel extends IBaseModel {
  consumerId: string
  citizenOf: string
  countryOfTaxResidence: string
  legalStatus: string
  taxId: string
  dateOfBirth: string
  passportOrIdNumber: string
  phoneNumber: string
}
