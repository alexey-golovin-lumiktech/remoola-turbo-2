import { Module } from '@nestjs/common';

import { AdminExchangeController } from './admin-exchange.controller';
import { providers } from './providers';
import { ConsumerExchangeModule } from '../../../consumer/modules/exchange/consumer-exchange.module';

@Module({
  imports: [ConsumerExchangeModule],
  controllers: [AdminExchangeController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminExchangeModule {}
