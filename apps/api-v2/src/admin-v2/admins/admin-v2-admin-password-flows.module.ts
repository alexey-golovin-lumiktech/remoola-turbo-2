import { Module } from '@nestjs/common';

import { AdminV2AdminAuditTrailModule } from './admin-v2-admin-audit-trail.module';
import { AdminV2AdminPasswordFlowsRepository } from './admin-v2-admin-password-flows.repository';
import { AdminV2AdminPasswordFlowsService } from './admin-v2-admin-password-flows.service';
import { AuthAuditModule } from '../../shared/auth-audit.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule, AuthAuditModule, AdminV2AdminAuditTrailModule],
  providers: [AdminV2AdminPasswordFlowsRepository, AdminV2AdminPasswordFlowsService],
  exports: [AdminV2AdminPasswordFlowsService],
})
export class AdminV2AdminPasswordFlowsModule {}
