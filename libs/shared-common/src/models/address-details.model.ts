import { IBaseModel } from './base.model'

export interface IAddressDetailsModel extends IBaseModel {
  consumerId: string
  street: string
  city: string
  region: string
  zipOrPostalCode: string
}
