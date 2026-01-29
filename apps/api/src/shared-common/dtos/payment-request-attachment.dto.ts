import { type PaymentRequestAttachmentModel } from '@remoola/database-2';

import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IPaymentRequestAttachmentResponse = WithoutDeletedAt<PaymentRequestAttachmentModel>;
export type IPaymentRequestAttachmentCreate = OnlyUpsertFields<WithoutDeletedAt<PaymentRequestAttachmentModel>>;
export type IPaymentRequestAttachmentUpdate = Partial<
  OnlyUpsertFields<WithoutDeletedAt<PaymentRequestAttachmentModel>>
>;
