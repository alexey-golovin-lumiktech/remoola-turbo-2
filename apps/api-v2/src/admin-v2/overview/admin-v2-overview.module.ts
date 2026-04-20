import { Module } from '@nestjs/common';

import { AdminV2OverviewController } from './admin-v2-overview.controller';
import { AdminV2OverviewService } from './admin-v2-overview.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2LedgerModule } from '../ledger/admin-v2-ledger.module';
import { AdminV2VerificationModule } from '../verification/admin-v2-verification.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2VerificationModule, AdminV2LedgerModule],
  controllers: [AdminV2OverviewController],
  providers: [AdminV2OverviewService],
})
export class AdminV2OverviewModule {}
