import { Module } from '@nestjs/common';

import { ConsumerExchangeRateReader } from './consumer-exchange-rate.reader';
import { ConsumerExchangeController } from './consumer-exchange.controller';
import { ConsumerExchangeScheduler } from './consumer-exchange.scheduler';
import { ConsumerExchangeService } from './consumer-exchange.service';

@Module({
  controllers: [ConsumerExchangeController],
  providers: [ConsumerExchangeRateReader, ConsumerExchangeService, ConsumerExchangeScheduler],
  exports: [ConsumerExchangeService],
})
export class ConsumerExchangeModule {}
