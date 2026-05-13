export const PAYMENT_DIRECTION = {
  INCOME: `INCOME`,
  OUTCOME: `OUTCOME`,
} as const;
export type TPaymentDirection = (typeof PAYMENT_DIRECTION)[keyof typeof PAYMENT_DIRECTION];
export const PAYMENT_DIRECTIONS = [PAYMENT_DIRECTION.INCOME, PAYMENT_DIRECTION.OUTCOME] as const;

export type TTransactionStatus =
  | `DRAFT`
  | `WAITING`
  | `WAITING_RECIPIENT_APPROVAL`
  | `PENDING`
  | `COMPLETED`
  | `DENIED`
  | `UNCOLLECTIBLE`;

export const PAYMENT_METHOD = {
  CREDIT_CARD: `CREDIT_CARD`,
  BANK_ACCOUNT: `BANK_ACCOUNT`,
} as const;
export type TPaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
