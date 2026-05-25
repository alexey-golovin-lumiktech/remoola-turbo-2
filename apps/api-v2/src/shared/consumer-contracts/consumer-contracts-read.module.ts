import { Module } from '@nestjs/common';

import { ConsumerContractsInMemoryQuery } from './consumer-contracts-in-memory.query';
import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractsService } from './consumer-contracts.service';

@Module({
  providers: [ConsumerContractsQuery, ConsumerContractsInMemoryQuery, ConsumerContractsService],
  exports: [ConsumerContractsService],
})
export class ConsumerContractsReadModule {}
