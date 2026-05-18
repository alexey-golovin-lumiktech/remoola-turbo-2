import { Module } from '@nestjs/common';

import { AdminV2AdminSessionsQuery } from './admin-v2-admin-sessions.query';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule],
  providers: [AdminV2AdminSessionsQuery, AdminV2AdminSessionsService],
  exports: [AdminV2AdminSessionsService],
})
export class AdminV2AdminSessionsModule {}
