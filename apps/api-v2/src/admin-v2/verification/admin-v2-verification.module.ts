import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2VerificationCaseService } from './admin-v2-verification-case.service';
import { AdminV2VerificationDecisionService } from './admin-v2-verification-decision.service';
import { ADMIN_V2_VERIFICATION_QUEUE_COUNTER } from './admin-v2-verification-queue-counter.port';
import { AdminV2VerificationQueueService } from './admin-v2-verification-queue.service';
import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { AdminV2VerificationController } from './admin-v2-verification.controller';
import { AdminV2VerificationQuery } from './admin-v2-verification.query';
import { AdminV2VerificationRepository } from './admin-v2-verification.repository';
import { AdminV2VerificationService } from './admin-v2-verification.service';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';
import { AdminV2ConsumersModule } from '../consumers/admin-v2-consumers.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2ConsumersModule, MailingModule, AdminV2AssignmentsModule],
  controllers: [AdminV2VerificationController],
  providers: [
    AdminV2VerificationService,
    AdminV2VerificationQueueService,
    AdminV2VerificationCaseService,
    AdminV2VerificationDecisionService,
    AdminV2VerificationQuery,
    AdminV2VerificationRepository,
    AdminV2VerificationSlaService,
    { provide: ADMIN_V2_VERIFICATION_QUEUE_COUNTER, useExisting: AdminV2VerificationService },
  ],
  exports: [AdminV2VerificationService, AdminV2VerificationSlaService, ADMIN_V2_VERIFICATION_QUEUE_COUNTER],
})
export class AdminV2VerificationModule {}
