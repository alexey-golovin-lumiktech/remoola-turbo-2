export const PaymentStatus = {
  PENDING: `pending`,
  COMPLETED: `completed`,
  FAILED: `failed`,
} as const;
export const PaymentStatuses = Object.values(PaymentStatus);
export type IPaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export type IStartPayment = {
  contractId: string;
  amountCents: number;
  currency?: string;
  method?: string;
};

export type IUpdatePaymentStatus = {
  status: IPaymentStatus;
};

export type IPaymentListItem = {
  id: string;
  contract: string;
  amount: string;
  method: string;
  status: IPaymentStatus;
  date: string;
};
