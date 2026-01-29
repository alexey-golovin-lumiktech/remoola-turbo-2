import {
  type PaymentRequestModel,
  type ConsumerModel,
  type PersonalDetailsModel,
  type AddressDetailsModel,
  type LedgerEntryModel,
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
  ledgerEntries: LedgerEntryModel[];
};

export type InvoiceTemplateParams = { invoiceNumber: string; payment: InvoicePayment };
