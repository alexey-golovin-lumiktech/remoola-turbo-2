import { Injectable } from '@nestjs/common';

import { type TPaymentReversalKind } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { type PaymentMailingService } from '../../shared/payment-mailing.service';

type ReversalEmailParams = Parameters<PaymentMailingService[`sendPaymentRefundEmail`]>[0];
type ReversalEmailer = Pick<PaymentMailingService, `sendPaymentRefundEmail` | `sendPaymentChargebackEmail`>;

type PaymentReversalPolicy = {
  auditAction: (typeof ADMIN_ACTION_AUDIT_ACTIONS)[keyof typeof ADMIN_ACTION_AUDIT_ACTIONS];
  initialLedgerStatus: $Enums.TransactionStatus;
  paymentRail: $Enums.PaymentRail;
  stripeObjectType: `refund` | `manual_chargeback`;
  requiresStripePaymentIntent: boolean;
  requiresRequesterBalanceCheck: boolean;
  queuesRefundFinalization: boolean;
  retriesLedgerAppendOnFailure: boolean;
  shouldFinalizeExistingStatus(status: $Enums.TransactionStatus | null): boolean;
  sendEmail(paymentMailingService: ReversalEmailer, params: ReversalEmailParams): Promise<void>;
};

const PAYMENT_REVERSAL_POLICIES = {
  REFUND: {
    auditAction: ADMIN_ACTION_AUDIT_ACTIONS.payment_refund,
    initialLedgerStatus: $Enums.TransactionStatus.PENDING,
    paymentRail: $Enums.PaymentRail.STRIPE_REFUND,
    stripeObjectType: `refund`,
    requiresStripePaymentIntent: true,
    requiresRequesterBalanceCheck: false,
    queuesRefundFinalization: true,
    retriesLedgerAppendOnFailure: true,
    shouldFinalizeExistingStatus: (status) =>
      status === $Enums.TransactionStatus.PENDING || status === $Enums.TransactionStatus.DENIED,
    sendEmail: (paymentMailingService, params) => paymentMailingService.sendPaymentRefundEmail(params),
  },
  CHARGEBACK: {
    auditAction: ADMIN_ACTION_AUDIT_ACTIONS.payment_chargeback,
    initialLedgerStatus: $Enums.TransactionStatus.COMPLETED,
    paymentRail: $Enums.PaymentRail.STRIPE_CHARGEBACK,
    stripeObjectType: `manual_chargeback`,
    requiresStripePaymentIntent: false,
    requiresRequesterBalanceCheck: true,
    queuesRefundFinalization: false,
    retriesLedgerAppendOnFailure: false,
    shouldFinalizeExistingStatus: () => false,
    sendEmail: (paymentMailingService, params) => paymentMailingService.sendPaymentChargebackEmail(params),
  },
} satisfies Record<TPaymentReversalKind, PaymentReversalPolicy>;

@Injectable()
export class AdminV2PaymentReversalPolicyProvider {
  get(kind: TPaymentReversalKind): PaymentReversalPolicy {
    return PAYMENT_REVERSAL_POLICIES[kind];
  }
}
