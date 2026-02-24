/**
 * Payment reversal kinds for admin payment requests.
 * Used for refund and chargeback operations.
 */

export const PAYMENT_REVERSAL_KIND = {
  REFUND: `REFUND`,
  CHARGEBACK: `CHARGEBACK`,
} as const;
export type TPaymentReversalKind = (typeof PAYMENT_REVERSAL_KIND)[keyof typeof PAYMENT_REVERSAL_KIND];

export const PAYMENT_REVERSAL_KINDS = [PAYMENT_REVERSAL_KIND.REFUND, PAYMENT_REVERSAL_KIND.CHARGEBACK] as const;
