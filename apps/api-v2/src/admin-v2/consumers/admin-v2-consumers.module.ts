import { Module } from '@nestjs/common';

import { AdminV2ConsumerActivityRepository } from './admin-v2-consumer-activity.repository';
import { ConsumerAdminCaseRepository } from './admin-v2-consumer-case.repository';
import { AdminV2ConsumerFlagsRepository } from './admin-v2-consumer-flags.repository';
import { AdminV2ConsumerLedgerRepository } from './admin-v2-consumer-ledger.repository';
import { AdminV2ConsumerNotesRepository } from './admin-v2-consumer-notes.repository';
import { AdminV2ConsumerRepository } from './admin-v2-consumer.repository';
import { AdminV2ConsumersController } from './admin-v2-consumers.controller';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';
import { ConsumerModule } from '../../consumer/consumer.module';
import { ConsumerContractsModule } from '../../consumer/modules/contracts/consumer-contracts.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [ConsumerContractsModule, ConsumerModule, AdminV2SharedModule],
  controllers: [AdminV2ConsumersController],
  providers: [
    AdminV2ConsumerRepository,
    AdminV2ConsumerLedgerRepository,
    AdminV2ConsumerActivityRepository,
    AdminV2ConsumerNotesRepository,
    AdminV2ConsumerFlagsRepository,
    ConsumerAdminCaseRepository,
    AdminV2ConsumersService,
  ],
  exports: [AdminV2ConsumersService],
})
export class AdminV2ConsumersModule {}
