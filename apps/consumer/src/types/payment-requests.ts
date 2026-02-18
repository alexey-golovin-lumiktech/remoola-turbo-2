export type CreatePaymentRequestPayload = {
  email: string;
  amount: string;
  currencyCode?: string;
  description?: string;
  dueDate?: string;
};

export type PaymentRequestSummary = {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  createdAt: string;
  description?: string | null;
};
