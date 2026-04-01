import { Module } from '@nestjs/common';

import { ConsumerExchangeController } from './consumer-exchange.controller';
import { ConsumerExchangeScheduler } from './consumer-exchange.scheduler';
import { ConsumerExchangeService } from './consumer-exchange.service';

@Module({
  controllers: [ConsumerExchangeController],
  providers: [ConsumerExchangeService, ConsumerExchangeScheduler],
  exports: [ConsumerExchangeService],
})
export class ConsumerExchangeModule {}
