import { IBillingDetailsModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IBillingDetailsResponse = WithoutDeletedAt<IBillingDetailsModel>
export type IUpsertBillingDetails = OnlyUpsertFields<IBillingDetailsResponse>
