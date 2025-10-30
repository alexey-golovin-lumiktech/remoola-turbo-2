import type { IBillingDetailsModel } from '../models/billing-details.mode'
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IBillingDetailsResponse = WithoutDeletedAt<IBillingDetailsModel>
export type IBillingDetailsCreate = OnlyUpsertFields<WithoutDeletedAt<IBillingDetailsModel>>
export type IBillingDetailsUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IBillingDetailsModel>>>
