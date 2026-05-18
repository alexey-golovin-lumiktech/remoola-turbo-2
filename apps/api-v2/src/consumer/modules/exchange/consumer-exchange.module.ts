import { Module } from '@nestjs/common';

import { ConsumerExchangeAutomationRepository } from './consumer-exchange-automation.repository';
import { ConsumerExchangeExecutionRepository } from './consumer-exchange-execution.repository';
import { ConsumerExchangeRateQuery } from './consumer-exchange-rate.query';
import { ConsumerExchangeRateReader } from './consumer-exchange-rate.reader';
import { ConsumerExchangeRateService } from './consumer-exchange-rate.service';
import { ConsumerExchangeController } from './consumer-exchange.controller';
import { ConsumerExchangeScheduler } from './consumer-exchange.scheduler';
import { ConsumerExchangeService } from './consumer-exchange.service';

@Module({
  controllers: [ConsumerExchangeController],
  providers: [
    ConsumerExchangeRateQuery,
    ConsumerExchangeRateReader,
    ConsumerExchangeRateService,
    ConsumerExchangeExecutionRepository,
    ConsumerExchangeAutomationRepository,
    ConsumerExchangeService,
    ConsumerExchangeScheduler,
  ],
  exports: [ConsumerExchangeService],
})
export class ConsumerExchangeModule {}
