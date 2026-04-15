import { Module } from '@nestjs/common';

import { AdminV2IdempotencyService } from './admin-v2-idempotency.service';

@Module({
  providers: [AdminV2IdempotencyService],
  exports: [AdminV2IdempotencyService],
})
export class AdminV2SharedModule {}
