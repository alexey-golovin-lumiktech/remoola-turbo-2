import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { AdminV2VerificationController } from './admin-v2-verification.controller';
import { AdminV2VerificationService } from './admin-v2-verification.service';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';
import { AdminV2ConsumersModule } from '../consumers/admin-v2-consumers.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2ConsumersModule, MailingModule, AdminV2AssignmentsModule],
  controllers: [AdminV2VerificationController],
  providers: [AdminV2VerificationService, AdminV2VerificationSlaService],
  exports: [AdminV2VerificationService, AdminV2VerificationSlaService],
})
export class AdminV2VerificationModule {}
