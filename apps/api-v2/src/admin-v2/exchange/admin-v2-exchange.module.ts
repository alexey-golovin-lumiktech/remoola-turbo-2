import { Module } from '@nestjs/common';

import { BalanceCalculationModule } from '../../shared/balance-calculation.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2ExchangeController } from './admin-v2-exchange.controller';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, BalanceCalculationModule, AdminV2AssignmentsModule],
  controllers: [AdminV2ExchangeController],
  providers: [AdminV2ExchangeService],
})
export class AdminV2ExchangeModule {}
