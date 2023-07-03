import { IAddressDetailsModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IAddressDetailsResponse = WithoutDeletedAt<IAddressDetailsModel>
export type IUpsertAddressDetails = OnlyUpsertFields<IAddressDetailsModel>
