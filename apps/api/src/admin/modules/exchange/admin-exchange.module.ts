import { Module } from '@nestjs/common';

import { ConsumerExchangeModule } from '../../../consumer/modules/exchange/consumer-exchange.module';
import { AdminExchangeController } from './admin-exchange.controller';
import { providers } from './providers';

@Module({
  imports: [ConsumerExchangeModule],
  controllers: [AdminExchangeController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminExchangeModule {}
