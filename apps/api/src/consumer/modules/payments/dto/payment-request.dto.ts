export class PaymentRequestDetailsDto {
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

  transactions: {
    id: string;
    status: string;
    actionType: string;
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
