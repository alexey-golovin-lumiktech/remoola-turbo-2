import { Module } from '@nestjs/common';

import { AdminV2AdminsActivityQuery } from './admin-v2-admins-activity.query';
import { AdminV2AdminsQueriesService } from './admin-v2-admins-queries.service';
import { AdminV2AdminsQuery } from './admin-v2-admins.query';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule],
  providers: [AdminV2AdminsActivityQuery, AdminV2AdminsQuery, AdminV2AdminsQueriesService],
  exports: [AdminV2AdminsQueriesService],
})
export class AdminV2AdminsQueriesModule {}
