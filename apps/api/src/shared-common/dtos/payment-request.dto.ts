import { type IPaymentRequestModel } from '../models/payment-request.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IPaymentRequestResponse = WithoutDeletedAt<IPaymentRequestModel>;
export type IPaymentRequestCreate = OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestModel>>;
export type IPaymentRequestUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPaymentRequestModel>>>;
export type IPaymentRequestResponseExtended = WithoutDeletedAt<IPaymentRequestModel> & {
  payerName: string;
  payerEmail: string;
  requesterName: string;
  requesterEmail: string;
};
