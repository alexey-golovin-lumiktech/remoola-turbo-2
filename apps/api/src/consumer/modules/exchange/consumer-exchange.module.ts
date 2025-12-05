import { Module } from '@nestjs/common';

import { ConsumerExchangeController } from './consumer-exchange.controller';
import { ConsumerExchangeService } from './consumer-exchange.service';

@Module({
  controllers: [ConsumerExchangeController],
  providers: [ConsumerExchangeService],
})
export class ConsumerExchangeModule {}
