import { Module } from '@nestjs/common';

import { AdminV2ConsumersController } from './admin-v2-consumers.controller';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';
import { ConsumerModule } from '../../consumer/consumer.module';
import { ConsumerContractsModule } from '../../consumer/modules/contracts/consumer-contracts.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [ConsumerContractsModule, ConsumerModule, AdminV2SharedModule],
  controllers: [AdminV2ConsumersController],
  providers: [AdminV2ConsumersService],
  exports: [AdminV2ConsumersService],
})
export class AdminV2ConsumersModule {}
