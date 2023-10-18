import { Module } from '@nestjs/common'

import { ExchangeRateRepository } from '../../../repositories'

import { ExchangeRateController } from './exchange-rate.controller'
import { ExchangeRateService } from './exchange-rate.service'

@Module({
  controllers: [ExchangeRateController],
  providers: [ExchangeRateRepository, ExchangeRateService],
  exports: [ExchangeRateRepository, ExchangeRateService],
})
export class ExchangeRateModule {}
