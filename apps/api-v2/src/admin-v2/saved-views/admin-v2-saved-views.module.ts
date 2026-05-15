import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2SavedViewsController } from './admin-v2-saved-views.controller';
import { AdminV2SavedViewsQuery } from './admin-v2-saved-views.query';
import { AdminV2SavedViewsRepository } from './admin-v2-saved-views.repository';
import { AdminV2SavedViewsService } from './admin-v2-saved-views.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2SavedViewsController],
  providers: [AdminV2SavedViewsService, AdminV2SavedViewsQuery, AdminV2SavedViewsRepository],
  exports: [AdminV2SavedViewsService],
})
export class AdminV2SavedViewsModule {}
