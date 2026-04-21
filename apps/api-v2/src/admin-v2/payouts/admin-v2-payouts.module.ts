import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2PayoutsController } from './admin-v2-payouts.controller';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule],
  controllers: [AdminV2PayoutsController],
  providers: [AdminV2PayoutsService],
  exports: [AdminV2PayoutsService],
})
export class AdminV2PayoutsModule {}
