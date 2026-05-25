import { Module } from '@nestjs/common';

import { ConsumerContractsController } from './consumer-contracts.controller';
import { ConsumerContractsReadModule } from '../../../shared/consumer-contracts/consumer-contracts-read.module';

@Module({
  imports: [ConsumerContractsReadModule],
  controllers: [ConsumerContractsController],
  exports: [ConsumerContractsReadModule],
})
export class ConsumerContractsModule {}
