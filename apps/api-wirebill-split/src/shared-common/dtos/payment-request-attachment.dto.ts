import { type IPaymentRequestAttachmentModel } from '@remoola/database';

import type { OnlyUpsertFields, WithoutDeletedAt } from '../types';

export type IPaymentRequestAttachmentResponse = WithoutDeletedAt<IPaymentRequestAttachmentModel>;
export type IPaymentRequestAttachmentCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestAttachmentModel>>;
export type IPaymentRequestAttachmentUpdate = Partial<
  OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestAttachmentModel>>
>;
