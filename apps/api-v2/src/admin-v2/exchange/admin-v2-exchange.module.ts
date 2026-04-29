import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { BalanceCalculationModule } from '../../shared/balance-calculation.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2ExchangeCommandsService } from './admin-v2-exchange-commands.service';
import { AdminV2ExchangeQueriesService } from './admin-v2-exchange-queries.service';
import { AdminV2ExchangeController } from './admin-v2-exchange.controller';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule, BalanceCalculationModule, AdminV2AssignmentsModule],
  controllers: [AdminV2ExchangeController],
  providers: [AdminV2ExchangeQueriesService, AdminV2ExchangeCommandsService, AdminV2ExchangeService],
})
export class AdminV2ExchangeModule {}
