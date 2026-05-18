import { Module } from '@nestjs/common';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminAuditTrailRepository } from './admin-v2-admin-audit-trail.repository';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule, MailingModule],
  providers: [AdminV2AdminLinks, AdminV2AdminAuditTrailRepository, AdminV2AdminAuditTrail],
  exports: [AdminV2AdminLinks, AdminV2AdminAuditTrail],
})
export class AdminV2AdminAuditTrailModule {}
