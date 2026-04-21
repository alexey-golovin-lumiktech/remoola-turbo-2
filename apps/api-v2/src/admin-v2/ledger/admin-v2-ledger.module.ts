import { Module } from '@nestjs/common';

import { AdminV2LedgerController } from './admin-v2-ledger.controller';
import { AdminV2LedgerService } from './admin-v2-ledger.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';
import { AdminV2LedgerAnomaliesController } from './anomalies/admin-v2-ledger-anomalies.controller';
import { AdminV2LedgerAnomaliesService } from './anomalies/admin-v2-ledger-anomalies.service';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule],
  controllers: [AdminV2LedgerController, AdminV2LedgerAnomaliesController],
  providers: [AdminV2LedgerService, AdminV2LedgerAnomaliesService],
  exports: [AdminV2LedgerService, AdminV2LedgerAnomaliesService],
})
export class AdminV2LedgerModule {}
