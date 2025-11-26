import { Module } from '@nestjs/common';

import { ConsumerDashboardController } from './consumer-dashboard.controller';
import { ConsumerDashboardService } from './consumer-dashboard.service';

@Module({
  controllers: [ConsumerDashboardController],
  providers: [ConsumerDashboardService],
})
export class ConsumerDashboardModule {}
