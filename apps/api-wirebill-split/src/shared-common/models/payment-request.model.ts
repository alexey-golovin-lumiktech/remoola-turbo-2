import { type TransactionStatus, type CurrencyCode, type TransactionType } from '@remoola/database';

import type { IBaseModel } from './base.model';

/* record is created when the request is created */
export type IPaymentRequestModel = {
  requesterId: string; // consumer_id
  payerId: string; // consumer_id
  amount: number; // in cents
  currencyCode: CurrencyCode;
  description: string;
  type: TransactionType;
  status: TransactionStatus; // ( status is changed by the admin depending on the status of the transaction)

  dueDate: Date;
  sentDate: Date;
  expectationDate: Date;

  createdBy: string;
  updatedBy: string;
  deletedBy?: string;
} & IBaseModel;
