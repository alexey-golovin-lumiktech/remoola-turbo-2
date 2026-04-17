import { Module } from '@nestjs/common';

import { AdminV2AccessRepository } from './admin-v2-access.repository';
import { AdminV2AccessService } from './admin-v2-access.service';
import { AdminV2DomainEventsService } from './admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from './admin-v2-idempotency.service';

@Module({
  providers: [AdminV2AccessRepository, AdminV2AccessService, AdminV2IdempotencyService, AdminV2DomainEventsService],
  exports: [AdminV2AccessService, AdminV2IdempotencyService, AdminV2DomainEventsService],
})
export class AdminV2SharedModule {}
