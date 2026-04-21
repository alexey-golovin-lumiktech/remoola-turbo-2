import { Module } from '@nestjs/common';

import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsService } from './admin-v2-payments.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule],
  controllers: [AdminV2PaymentsController],
  providers: [AdminV2PaymentsService],
  exports: [AdminV2PaymentsService],
})
export class AdminV2PaymentsModule {}
