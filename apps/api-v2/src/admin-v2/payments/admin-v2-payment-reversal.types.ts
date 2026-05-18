import { type TPaymentReversalKind } from '@remoola/api-types';

export type PaymentReversalCreateInput = {
  kind: TPaymentReversalKind;
  amount?: number;
  reason?: string;
};
