import { Module } from '@nestjs/common';

import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractsService } from './consumer-contracts.service';

@Module({
  providers: [ConsumerContractsQuery, ConsumerContractsService],
  exports: [ConsumerContractsService],
})
export class ConsumerContractsReadModule {}
