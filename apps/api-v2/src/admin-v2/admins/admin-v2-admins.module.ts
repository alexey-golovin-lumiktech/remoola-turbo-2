import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { envs } from '../../envs';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminAuditTrailRepository } from './admin-v2-admin-audit-trail.repository';
import { AdminV2AdminInvitationsRepository } from './admin-v2-admin-invitations.repository';
import { AdminV2AdminInvitationsService } from './admin-v2-admin-invitations.service';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { AdminV2AdminMutationsService } from './admin-v2-admin-mutations.service';
import { AdminV2AdminPasswordFlowsRepository } from './admin-v2-admin-password-flows.repository';
import { AdminV2AdminPasswordFlowsService } from './admin-v2-admin-password-flows.service';
import { AdminV2AdminSessionsQuery } from './admin-v2-admin-sessions.query';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import { AdminV2AdminsActivityQuery } from './admin-v2-admins-activity.query';
import { AdminV2AdminsQueriesService } from './admin-v2-admins-queries.service';
import { AdminV2AdminsController } from './admin-v2-admins.controller';
import { AdminV2AdminsQuery } from './admin-v2-admins.query';
import { AdminV2AdminsService } from './admin-v2-admins.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminV2SharedModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
    MailingModule,
  ],
  controllers: [AdminV2AdminsController],
  providers: [
    AdminV2AdminLinks,
    AdminV2AdminAuditTrailRepository,
    AdminV2AdminAuditTrail,
    AdminV2AdminsActivityQuery,
    AdminV2AdminsQuery,
    AdminV2AdminsQueriesService,
    AdminV2AdminMutationsRepository,
    AdminV2AdminMutationsService,
    AdminV2AdminInvitationsRepository,
    AdminV2AdminInvitationsService,
    AdminV2AdminPasswordFlowsRepository,
    AdminV2AdminPasswordFlowsService,
    AdminV2AdminSessionsQuery,
    AdminV2AdminsService,
    AdminV2AdminSessionsService,
  ],
  exports: [AdminV2AdminsService],
})
export class AdminV2AdminsModule {}
