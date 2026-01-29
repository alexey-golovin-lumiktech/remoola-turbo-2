import type { IBaseModel } from './base.model';

export type IPaymentRequestAttachmentModel = {
  requesterId: string;
  paymentRequestId: string;
  resourceId: string;
} & IBaseModel;
