import { IBaseModel } from '../common'

export interface IAddressDetailsModel extends IBaseModel {
  street: string
  city: string
  region: string
  zipOrPostalCode: string
}
