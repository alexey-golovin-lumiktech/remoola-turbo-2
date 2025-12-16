import { type TPaymentDirection } from '@remoola/api-types';

export class PaymentRequestDetails {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  type: string;

  payer: {
    id: string;
    email: string;
  };

  requester: {
    id: string;
    email: string;
  };

  description: string | null;
  dueDate: string | null;
  expectationDate: string | null;
  sentDate: string | null;

  createdAt: string;
  updatedAt: string;

  ledgerEntries: {
    id: string;
    status: string;
    direction: TPaymentDirection;
    createdAt: string;
  }[];

  attachments: {
    id: string;
    name: string;
    downloadUrl: string;
    size: number;
    createdAt: string;
  }[];
}
