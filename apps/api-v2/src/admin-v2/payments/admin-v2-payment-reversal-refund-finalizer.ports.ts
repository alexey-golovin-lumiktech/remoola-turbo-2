import { type Prisma } from '@remoola/database-2';

import { type AdminRefundFinalizationOutboxPayload } from './admin-v2-payment-reversal-refund-outbox';
import { type AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
import { type AdminActionAuditService } from '../../shared/admin-action-audit.service';

import type Stripe from 'stripe';

export const PAYMENT_REVERSAL_STRIPE_REFUND_PORT = Symbol(`PAYMENT_REVERSAL_STRIPE_REFUND_PORT`);
export const PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT = Symbol(`PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT`);
export const PAYMENT_REVERSAL_REFUND_OUTBOX_PORT = Symbol(`PAYMENT_REVERSAL_REFUND_OUTBOX_PORT`);
export const PAYMENT_REVERSAL_AUDIT_PORT = Symbol(`PAYMENT_REVERSAL_AUDIT_PORT`);
export const PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT = Symbol(`PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT`);

export type PaymentReversalStripeRefundPort = {
  refunds: Pick<Stripe[`refunds`], `create` | `retrieve`>;
};

export type PaymentReversalLedgerFinalizationPort = Pick<
  AdminV2PaymentReversalRepository,
  `finalizeRefundReversal` | `markRefundReversalDenied`
>;

export type PaymentReversalRefundOutboxPort = {
  queuePending(payload: AdminRefundFinalizationOutboxPayload): Promise<unknown>;
  markSentByIdempotencyKey(idempotencyKey: string): Promise<unknown>;
  markFailedByIdempotencyKey(idempotencyKey: string, error: unknown): Promise<unknown>;
  markDeadByIdempotencyKey(idempotencyKey: string, error: unknown): Promise<unknown>;
};

export type PaymentReversalAuditPort = Pick<AdminActionAuditService, `recordRequired`>;

export type PaymentReversalLedgerTransactionPort = {
  runLedgerMutation<T>(callback: (client: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

export type PaymentReversalRefundFinalizerPorts = {
  ledgerFinalization: PaymentReversalLedgerFinalizationPort;
  refundOutbox: PaymentReversalRefundOutboxPort;
  audit: PaymentReversalAuditPort;
  transactions: PaymentReversalLedgerTransactionPort;
  stripe: PaymentReversalStripeRefundPort;
};
