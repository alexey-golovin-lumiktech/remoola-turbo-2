import { IBaseModel } from '../common'

export interface IAddressDetailsModel extends IBaseModel {
  consumerId: string
  street: string
  city: string
  region: string
  zipOrPostalCode: string
}
