import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';
export type ITransactionModel = {
  consumerId: string;
  code?: string;
  type: $Enums.TransactionType;
  amount: number;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;

  createdBy: string;
  updatedBy: string;
  deletedBy?: string;

  paymentRequestId?: string | null | undefined;
  feesType?: $Enums.TransactionFeesType | null | undefined;
  feesAmount?: number | null | undefined;
  stripeId?: string | null | undefined;
  stripeFeeInPercents?: number | null | undefined;
} & IBaseModel;
