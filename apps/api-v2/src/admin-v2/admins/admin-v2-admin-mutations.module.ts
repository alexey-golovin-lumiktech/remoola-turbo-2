import { Module } from '@nestjs/common';

import { AdminV2AdminAuditTrailModule } from './admin-v2-admin-audit-trail.module';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { AdminV2AdminMutationsService } from './admin-v2-admin-mutations.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AdminAuditTrailModule],
  providers: [AdminV2AdminMutationsRepository, AdminV2AdminMutationsService],
  exports: [AdminV2AdminMutationsService],
})
export class AdminV2AdminMutationsModule {}
