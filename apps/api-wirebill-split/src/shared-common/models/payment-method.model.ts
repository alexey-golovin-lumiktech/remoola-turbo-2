import { type PaymentMethodType } from '@remoola/database';

import type { CreditCardExpMonth, CreditCardExpYear } from '../types';
import type { IBaseModel } from './base.model';

export type IPaymentMethodCommon = {
  consumerId: string;
  brand: string;
  last4: string;
  defaultSelected: boolean;

  billingDetailsId?: string;
  serviceFee?: number;
} & IBaseModel //eslint-disable-line

export type IPaymentMethodBankAccountModel = {
  type: typeof PaymentMethodType.BANK_ACCOUNT;
} & IPaymentMethodCommon;

export type IPaymentMethodCreditCardModel = {
  type: typeof PaymentMethodType.CREDIT_CARD;
  expMonth: CreditCardExpMonth;
  expYear: CreditCardExpYear;
} & IPaymentMethodCommon;

export type IPaymentMethodModel = {
  consumerId: string;
  type: PaymentMethodType;
  brand: string;
  last4: string;
  defaultSelected: boolean;

  billingDetailsId?: string;
  serviceFee?: number;
  expMonth?: CreditCardExpMonth;
  expYear?: CreditCardExpYear;
} & IBaseModel;

export type IPaymentMethodModelType = IPaymentMethodCreditCardModel | IPaymentMethodBankAccountModel;
