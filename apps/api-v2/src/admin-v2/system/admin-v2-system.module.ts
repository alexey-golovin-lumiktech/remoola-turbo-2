import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2SystemController } from './admin-v2-system.controller';
import { AdminV2SystemService } from './admin-v2-system.service';
import { AdminV2LedgerModule } from '../ledger/admin-v2-ledger.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2LedgerModule],
  controllers: [AdminV2SystemController],
  providers: [AdminV2SystemService],
})
export class AdminV2SystemModule {}
