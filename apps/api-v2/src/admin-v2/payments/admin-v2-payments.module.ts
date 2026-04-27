import { Module } from '@nestjs/common';

import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsService } from './admin-v2-payments.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule, AdminV2AssignmentsModule, MailingModule],
  controllers: [AdminV2PaymentsController],
  providers: [AdminV2PaymentsService, AdminV2PaymentReversalService],
  exports: [AdminV2PaymentsService],
})
export class AdminV2PaymentsModule {}
