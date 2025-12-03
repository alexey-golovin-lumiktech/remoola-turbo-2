import { Module } from '@nestjs/common';

import { ConsumerContractsController } from './consumer-contracts.controller';
import { ConsumerContractsService } from './consumer-contracts.service';

@Module({
  imports: [],
  controllers: [ConsumerContractsController],
  providers: [ConsumerContractsService],
  exports: [ConsumerContractsService],
})
export class ConsumerContractsModule {}
