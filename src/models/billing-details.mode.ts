import { BaseModel, IBaseModel } from './base'

export interface IBillingDetailsModel extends IBaseModel {
  consumerId: string
  addressId: string

  email?: string
  name?: string
  phone?: string
}

export class BillingDetailsModel extends BaseModel implements IBillingDetailsModel {
  consumerId: string
  addressId: string

  email?: string
  name?: string
  phone?: string
}
