/* eslint-disable simple-import-sort/imports */
import type { IBaseModel } from './base.model'
import type { IAddressDetailsModel } from './address-details.model'

export type IContactModel = {
  consumerId: string
  email: string
  name?: string
  address: Omit<IAddressDetailsModel, keyof IBaseModel | `consumerId`>
} & IBaseModel
