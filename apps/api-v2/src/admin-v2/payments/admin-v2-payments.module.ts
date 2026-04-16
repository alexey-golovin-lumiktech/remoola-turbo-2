import { Module } from '@nestjs/common';

import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsService } from './admin-v2-payments.service';

@Module({
  controllers: [AdminV2PaymentsController],
  providers: [AdminV2PaymentsService],
  exports: [AdminV2PaymentsService],
})
export class AdminV2PaymentsModule {}
