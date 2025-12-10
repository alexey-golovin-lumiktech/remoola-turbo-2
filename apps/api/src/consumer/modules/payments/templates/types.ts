import {
  type PaymentRequestModel,
  type ConsumerModel,
  type PersonalDetailsModel,
  type AddressDetailsModel,
  type TransactionModel,
} from '@remoola/database-2';

export type InvoicePayment = PaymentRequestModel & {
  payer: ConsumerModel & {
    personalDetails: PersonalDetailsModel;
    addressDetails: AddressDetailsModel;
  };
} & {
  requester: ConsumerModel & {
    personalDetails: PersonalDetailsModel;
  };
} & {
  transactions: TransactionModel[];
};

export type InvoiceTemplateParams = { invoiceNumber: string; payment: InvoicePayment };
