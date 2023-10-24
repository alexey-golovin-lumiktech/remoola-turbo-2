import { forwardRef, Module } from '@nestjs/common'

import { ExchangeRateRepository } from '../../../repositories'
import { TransactionModule } from '../transaction/transaction.module'

import { ExchangeRateController } from './exchange-rate.controller'
import { ExchangeRateService } from './exchange-rate.service'

@Module({
  imports: [forwardRef(() => TransactionModule)],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateRepository, ExchangeRateService],
  exports: [ExchangeRateRepository, ExchangeRateService],
})
export class ExchangeRateModule {}
