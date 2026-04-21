import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2SavedViewsController } from './admin-v2-saved-views.controller';
import { AdminV2SavedViewsService } from './admin-v2-saved-views.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2SavedViewsController],
  providers: [AdminV2SavedViewsService],
  exports: [AdminV2SavedViewsService],
})
export class AdminV2SavedViewsModule {}
