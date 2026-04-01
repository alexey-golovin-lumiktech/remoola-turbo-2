import { Module } from '@nestjs/common';

import { ConsumerDashboardController } from './consumer-dashboard.controller';
import { ConsumerDashboardService } from './consumer-dashboard.service';
import { BalanceCalculationModule } from '../../../shared/balance-calculation.module';

@Module({
  imports: [BalanceCalculationModule],
  controllers: [ConsumerDashboardController],
  providers: [ConsumerDashboardService],
})
export class ConsumerDashboardModule {}
