import { Module } from '@nestjs/common';

import { AdminV2ConsumersController } from './admin-v2-consumers.controller';
import { AdminV2ConsumersService } from './admin-v2-consumers.service';
import { ConsumerContractsModule } from '../../consumer/modules/contracts/consumer-contracts.module';

@Module({
  imports: [ConsumerContractsModule],
  controllers: [AdminV2ConsumersController],
  providers: [AdminV2ConsumersService],
  exports: [AdminV2ConsumersService],
})
export class AdminV2ConsumersModule {}
