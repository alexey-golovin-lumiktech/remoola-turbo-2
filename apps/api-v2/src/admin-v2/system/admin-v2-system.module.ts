import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2SystemController } from './admin-v2-system.controller';
import { AdminV2SystemService } from './admin-v2-system.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2SystemController],
  providers: [AdminV2SystemService],
})
export class AdminV2SystemModule {}
