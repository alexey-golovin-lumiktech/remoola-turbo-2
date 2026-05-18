import { Module } from '@nestjs/common';

import { AdminV2AdminInvitationsModule } from './admin-v2-admin-invitations.module';
import { AdminV2AdminMutationsModule } from './admin-v2-admin-mutations.module';
import { AdminV2AdminPasswordFlowsModule } from './admin-v2-admin-password-flows.module';
import { AdminV2AdminSessionsModule } from './admin-v2-admin-sessions.module';
import { AdminV2AdminsQueriesModule } from './admin-v2-admins-queries.module';
import { AdminV2AdminsController } from './admin-v2-admins.controller';
import { AdminV2AdminsService } from './admin-v2-admins.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminV2SharedModule,
    AdminV2AdminsQueriesModule,
    AdminV2AdminMutationsModule,
    AdminV2AdminInvitationsModule,
    AdminV2AdminPasswordFlowsModule,
    AdminV2AdminSessionsModule,
  ],
  controllers: [AdminV2AdminsController],
  providers: [AdminV2AdminsService],
  exports: [AdminV2AdminsService],
})
export class AdminV2AdminsModule {}
