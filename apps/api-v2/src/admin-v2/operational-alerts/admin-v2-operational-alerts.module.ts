import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2OperationalAlertsEvaluatorService } from './admin-v2-operational-alerts-evaluator.service';
import { LedgerAnomaliesAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';
import { AdminV2OperationalAlertsController } from './admin-v2-operational-alerts.controller';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';
import { AdminV2LedgerModule } from '../ledger/admin-v2-ledger.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2LedgerModule],
  controllers: [AdminV2OperationalAlertsController],
  providers: [AdminV2OperationalAlertsService, AdminV2OperationalAlertsEvaluatorService, LedgerAnomaliesAlertEvaluator],
  exports: [AdminV2OperationalAlertsService],
})
export class AdminV2OperationalAlertsModule {}
