import { Module } from '@nestjs/common';

import { AdminV2AccessRepository } from './admin-v2-access.repository';
import { AdminV2AccessService } from './admin-v2-access.service';
import { AdminV2DomainEventsService } from './admin-v2-domain-events.service';
import { ADMIN_V2_IDEMPOTENCY_OPTIONS, DEFAULT_ADMIN_V2_IDEMPOTENCY_OPTIONS } from './admin-v2-idempotency.options';
import { ADMIN_V2_IDEMPOTENCY_REPOSITORY, AdminV2IdempotencyRepository } from './admin-v2-idempotency.repository';
import { AdminV2IdempotencyService } from './admin-v2-idempotency.service';
import { PrismaModule } from '../shared/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    AdminV2AccessRepository,
    AdminV2AccessService,
    AdminV2IdempotencyRepository,
    { provide: ADMIN_V2_IDEMPOTENCY_REPOSITORY, useExisting: AdminV2IdempotencyRepository },
    { provide: ADMIN_V2_IDEMPOTENCY_OPTIONS, useValue: DEFAULT_ADMIN_V2_IDEMPOTENCY_OPTIONS },
    AdminV2IdempotencyService,
    AdminV2DomainEventsService,
  ],
  exports: [AdminV2AccessService, AdminV2IdempotencyService, AdminV2DomainEventsService],
})
export class AdminV2SharedModule {}
