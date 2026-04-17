import { Module } from '@nestjs/common';

import { AdminV2LedgerController } from './admin-v2-ledger.controller';
import { AdminV2LedgerService } from './admin-v2-ledger.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2LedgerController],
  providers: [AdminV2LedgerService],
  exports: [AdminV2LedgerService],
})
export class AdminV2LedgerModule {}
