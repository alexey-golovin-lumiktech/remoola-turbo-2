import { Module } from '@nestjs/common';

import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import { AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { AdminV2PaymentReversalRefundOutboxService } from './admin-v2-payment-reversal-refund-outbox.service';
import { AdminV2PaymentReversalWorkflowService } from './admin-v2-payment-reversal-workflow.service';
import { AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsQuery } from './admin-v2-payments.query';
import { AdminV2PaymentsService } from './admin-v2-payments.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule, AdminV2AssignmentsModule, MailingModule],
  controllers: [AdminV2PaymentsController],
  providers: [
    AdminV2PaymentsService,
    AdminV2PaymentsQuery,
    AdminV2PaymentReversalService,
    AdminV2PaymentReversalWorkflowService,
    AdminV2PaymentReversalRefundFinalizerService,
    AdminV2PaymentReversalRefundOutboxRepository,
    AdminV2PaymentReversalRefundOutboxService,
    AdminV2PaymentReversalQuery,
    AdminV2PaymentReversalRepository,
  ],
  exports: [AdminV2PaymentsService],
})
export class AdminV2PaymentsModule {}
