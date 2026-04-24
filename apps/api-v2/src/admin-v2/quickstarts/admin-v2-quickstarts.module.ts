import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2QuickstartsController } from './admin-v2-quickstarts.controller';
import { AdminV2QuickstartsService } from './admin-v2-quickstarts.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2QuickstartsController],
  providers: [AdminV2QuickstartsService],
  exports: [AdminV2QuickstartsService],
})
export class AdminV2QuickstartsModule {}
