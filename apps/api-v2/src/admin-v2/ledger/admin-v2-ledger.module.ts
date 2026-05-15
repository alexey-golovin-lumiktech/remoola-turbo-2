import { Module } from '@nestjs/common';

import { AdminV2LedgerController } from './admin-v2-ledger.controller';
import { AdminV2LedgerQuery } from './admin-v2-ledger.query';
import { AdminV2LedgerService } from './admin-v2-ledger.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';
import { AdminV2LedgerAnomaliesLatestOutcomeQuery } from './anomalies/admin-v2-ledger-anomalies-latest-outcome.query';
import { AdminV2LedgerAnomaliesValueIntegrityQuery } from './anomalies/admin-v2-ledger-anomalies-value-integrity.query';
import { AdminV2LedgerAnomaliesController } from './anomalies/admin-v2-ledger-anomalies.controller';
import { AdminV2LedgerAnomaliesQuery } from './anomalies/admin-v2-ledger-anomalies.query';
import { AdminV2LedgerAnomaliesService } from './anomalies/admin-v2-ledger-anomalies.service';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule],
  controllers: [AdminV2LedgerController, AdminV2LedgerAnomaliesController],
  providers: [
    AdminV2LedgerService,
    AdminV2LedgerQuery,
    AdminV2LedgerAnomaliesLatestOutcomeQuery,
    AdminV2LedgerAnomaliesValueIntegrityQuery,
    AdminV2LedgerAnomaliesQuery,
    AdminV2LedgerAnomaliesService,
  ],
  exports: [AdminV2LedgerService, AdminV2LedgerAnomaliesService],
})
export class AdminV2LedgerModule {}
