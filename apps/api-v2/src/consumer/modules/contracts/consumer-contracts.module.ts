import { Module } from '@nestjs/common';

import { ConsumerContractsController } from './consumer-contracts.controller';
import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractsService } from './consumer-contracts.service';

@Module({
  imports: [],
  controllers: [ConsumerContractsController],
  providers: [ConsumerContractsQuery, ConsumerContractsService],
  exports: [ConsumerContractsService],
})
export class ConsumerContractsModule {}
