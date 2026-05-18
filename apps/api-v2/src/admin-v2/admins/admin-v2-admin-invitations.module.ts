import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminV2AdminAuditTrailModule } from './admin-v2-admin-audit-trail.module';
import { AdminV2AdminInvitationsRepository } from './admin-v2-admin-invitations.repository';
import { AdminV2AdminInvitationsService } from './admin-v2-admin-invitations.service';
import { envs } from '../../envs';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [
    AdminV2SharedModule,
    AdminV2AdminAuditTrailModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  providers: [AdminV2AdminInvitationsRepository, AdminV2AdminInvitationsService],
  exports: [AdminV2AdminInvitationsService],
})
export class AdminV2AdminInvitationsModule {}
