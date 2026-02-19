export const PaymentDirection = {
  INCOME: `INCOME`,
  OUTCOME: `OUTCOME`,
} as const;
export type TPaymentDirection = (typeof PaymentDirection)[keyof typeof PaymentDirection];
export const PaymentDirections: TPaymentDirection[] = Object.values(PaymentDirection);

export const TransactionStatus = {
  DRAFT: `DRAFT`,
  WAITING: `WAITING`,
  WAITING_RECIPIENT_APPROVAL: `WAITING_RECIPIENT_APPROVAL`,
  PENDING: `PENDING`,
  COMPLETED: `COMPLETED`,
  DENIED: `DENIED`,
  UNCOLLECTIBLE: `UNCOLLECTIBLE`,
} as const;
export type TTransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const PaymentMethodTypes = {
  CREDIT_CARD: `CREDIT_CARD`,
  BANK_ACCOUNT: `BANK_ACCOUNT`,
} as const;
export type TPaymentMethodType = (typeof PaymentMethodTypes)[keyof typeof PaymentMethodTypes];
