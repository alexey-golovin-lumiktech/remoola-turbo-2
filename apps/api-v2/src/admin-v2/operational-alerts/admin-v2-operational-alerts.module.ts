import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2OperationalAlertsAuthRefreshReuseQuery } from './admin-v2-operational-alerts-auth-refresh-reuse.query';
import { AdminV2OperationalAlertsEvaluatorQuery } from './admin-v2-operational-alerts-evaluator.query';
import { AdminV2OperationalAlertsEvaluatorRepository } from './admin-v2-operational-alerts-evaluator.repository';
import { AdminV2OperationalAlertsEvaluatorService } from './admin-v2-operational-alerts-evaluator.service';
import { LedgerAnomaliesAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';
import { AuthRefreshReuseAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse';
import { VerificationQueueAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-verification';
import { AdminV2OperationalAlertsController } from './admin-v2-operational-alerts.controller';
import { AdminV2OperationalAlertsQuery } from './admin-v2-operational-alerts.query';
import { AdminV2OperationalAlertsRepository } from './admin-v2-operational-alerts.repository';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';
import { AdminV2LedgerModule } from '../ledger/admin-v2-ledger.module';
import { AdminV2VerificationModule } from '../verification/admin-v2-verification.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2LedgerModule, AdminV2VerificationModule],
  controllers: [AdminV2OperationalAlertsController],
  providers: [
    AdminV2OperationalAlertsService,
    AdminV2OperationalAlertsQuery,
    AdminV2OperationalAlertsRepository,
    AdminV2OperationalAlertsEvaluatorService,
    AdminV2OperationalAlertsEvaluatorQuery,
    AdminV2OperationalAlertsEvaluatorRepository,
    AdminV2OperationalAlertsAuthRefreshReuseQuery,
    LedgerAnomaliesAlertEvaluator,
    VerificationQueueAlertEvaluator,
    AuthRefreshReuseAlertEvaluator,
  ],
  exports: [AdminV2OperationalAlertsService],
})
export class AdminV2OperationalAlertsModule {}
