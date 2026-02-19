import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';

/* record is created when the request is created */
export type IPaymentRequestModel = {
  requesterId: string; // consumer_id
  payerId: string | null; // consumer_id
  payerEmail?: string | null; // email-only recipient fallback
  amount: number; // in cents
  currencyCode: $Enums.CurrencyCode;
  description: string;
  type: $Enums.TransactionType;
  status: $Enums.TransactionStatus; // ( status is changed by the admin depending on the status of the transaction)

  dueDate: Date;
  sentDate: Date;

  createdBy: string;
  updatedBy: string;
  deletedBy?: string;
} & IBaseModel;
