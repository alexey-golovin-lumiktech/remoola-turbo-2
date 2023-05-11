import { BaseModel, IBaseModel } from './base'

export interface IBillingDetailsModel extends IBaseModel {
  consumerId: string
  addressId: string

  email: string | null
  name: string | null
  phone: string | null
}

export class BillingDetailsModel extends BaseModel implements IBillingDetailsModel {
  consumerId: string
  addressId: string

  email: string | null
  name: string | null
  phone: string | null
}
