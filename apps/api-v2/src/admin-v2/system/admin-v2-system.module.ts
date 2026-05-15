import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2SystemController } from './admin-v2-system.controller';
import { AdminV2SystemQuery } from './admin-v2-system.query';
import { AdminV2SystemService } from './admin-v2-system.service';
import { AdminV2LedgerModule } from '../ledger/admin-v2-ledger.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2LedgerModule],
  controllers: [AdminV2SystemController],
  providers: [AdminV2SystemQuery, AdminV2SystemService],
})
export class AdminV2SystemModule {}
