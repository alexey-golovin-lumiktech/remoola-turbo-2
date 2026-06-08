import { Module } from '@nestjs/common';

import { AdminV2AdminAccessCommandsService } from './admin-v2-admin-access-commands.service';
import { AdminV2AdminAuditTrailModule } from './admin-v2-admin-audit-trail.module';
import { AdminV2AdminCredentialsCommandsService } from './admin-v2-admin-credentials-commands.service';
import { AdminV2AdminLifecycleCommandsService } from './admin-v2-admin-lifecycle-commands.service';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AdminAuditTrailModule],
  providers: [
    AdminV2AdminMutationsRepository,
    AdminV2AdminCredentialsCommandsService,
    AdminV2AdminLifecycleCommandsService,
    AdminV2AdminAccessCommandsService,
  ],
  exports: [
    AdminV2AdminCredentialsCommandsService,
    AdminV2AdminLifecycleCommandsService,
    AdminV2AdminAccessCommandsService,
  ],
})
export class AdminV2AdminMutationsModule {}
