import { Module } from '@nestjs/common';

import { AdminV2PaymentReversalNotificationService } from './admin-v2-payment-reversal-notification.service';
import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import {
  PAYMENT_REVERSAL_AUDIT_PORT,
  PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT,
  PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT,
  PAYMENT_REVERSAL_REFUND_OUTBOX_PORT,
  PAYMENT_REVERSAL_STRIPE_REFUND_PORT,
} from './admin-v2-payment-reversal-refund-finalizer.ports';
import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import { AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { AdminV2PaymentReversalRefundOutboxService } from './admin-v2-payment-reversal-refund-outbox.service';
import { AdminV2PaymentReversalRequestPreparerService } from './admin-v2-payment-reversal-request-preparer.service';
import { AdminV2PaymentReversalStripeRefundAdapter } from './admin-v2-payment-reversal-stripe-refund.adapter';
import { AdminV2PaymentReversalWorkflowService } from './admin-v2-payment-reversal-workflow.service';
import { AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsPresenter } from './admin-v2-payments.presenter';
import { AdminV2PaymentsQuery } from './admin-v2-payments.query';
import { AdminV2PaymentsService } from './admin-v2-payments.service';
import { AdminStepUpModule } from '../../admin-auth/admin-step-up.module';
import { AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { MailingModule } from '../../shared/mailing.module';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminStepUpModule, AdminV2SharedModule, AdminV2AssignmentsModule, MailingModule],
  controllers: [AdminV2PaymentsController],
  providers: [
    AdminV2PaymentsService,
    AdminV2PaymentsPresenter,
    AdminV2PaymentsQuery,
    AdminV2PaymentReversalService,
    AdminV2PaymentReversalRequestPreparerService,
    AdminV2PaymentReversalNotificationService,
    AdminV2PaymentReversalPolicyProvider,
    AdminV2PaymentReversalWorkflowService,
    AdminV2PaymentReversalRefundFinalizerService,
    AdminV2PaymentReversalStripeRefundAdapter,
    AdminV2PaymentReversalRefundOutboxRepository,
    AdminV2PaymentReversalRefundOutboxService,
    AdminV2PaymentReversalQuery,
    AdminV2PaymentReversalRepository,
    { provide: PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT, useExisting: AdminV2PaymentReversalRepository },
    { provide: PAYMENT_REVERSAL_REFUND_OUTBOX_PORT, useExisting: AdminV2PaymentReversalRefundOutboxRepository },
    { provide: PAYMENT_REVERSAL_AUDIT_PORT, useExisting: AdminActionAuditService },
    { provide: PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT, useExisting: PrismaTransactionRunner },
    { provide: PAYMENT_REVERSAL_STRIPE_REFUND_PORT, useExisting: AdminV2PaymentReversalStripeRefundAdapter },
  ],
  exports: [AdminV2PaymentsService],
})
export class AdminV2PaymentsModule {}
