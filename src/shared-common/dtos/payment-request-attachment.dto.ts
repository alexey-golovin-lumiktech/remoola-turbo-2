import type { IPaymentRequestAttachmentModel } from '../models/payment-request-attachment.model'
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IPaymentRequestAttachmentResponse = WithoutDeletedAt<IPaymentRequestAttachmentModel>
export type IPaymentRequestAttachmentCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestAttachmentModel>>
export type IPaymentRequestAttachmentUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestAttachmentModel>>>
