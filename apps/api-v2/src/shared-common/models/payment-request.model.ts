import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';
export type IPaymentRequestModel = {
  requesterId: string;
  payerId: string | null;
  payerEmail?: string | null;
  amount: number;
  currencyCode: $Enums.CurrencyCode;
  description: string;
  type: $Enums.TransactionType;
  status: $Enums.TransactionStatus;

  dueDate: Date;
  sentDate: Date;

  createdBy: string;
  updatedBy: string;
  deletedBy?: string;
} & IBaseModel;
