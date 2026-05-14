import { Module } from '@nestjs/common';

import { ConsumerDashboardController } from './consumer-dashboard.controller';
import { ConsumerDashboardQuery } from './consumer-dashboard.query';
import { ConsumerDashboardService } from './consumer-dashboard.service';
import { BalanceCalculationModule } from '../../../shared/balance-calculation.module';

@Module({
  imports: [BalanceCalculationModule],
  controllers: [ConsumerDashboardController],
  providers: [ConsumerDashboardQuery, ConsumerDashboardService],
})
export class ConsumerDashboardModule {}
