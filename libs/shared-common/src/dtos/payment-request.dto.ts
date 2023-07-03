import { IPaymentRequestModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IPaymentRequestResponse = WithoutDeletedAt<IPaymentRequestModel>
export type IUpsertPaymentRequest = OnlyUpsertFields<IPaymentRequestResponse>
