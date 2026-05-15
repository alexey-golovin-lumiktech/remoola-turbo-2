import { type $Enums } from '@remoola/database-2';

import { type CreditCardExpMonth, type CreditCardExpYear } from '../types';
import { type IBaseModel } from './base.model';

export type IPaymentMethodModel = {
  consumerId: string;
  type: $Enums.PaymentMethodType;
  brand: string;
  last4: string;
  defaultSelected: boolean;

  billingDetailsId?: string;
  serviceFee?: number;
  expMonth?: CreditCardExpMonth;
  expYear?: CreditCardExpYear;
} & IBaseModel;
