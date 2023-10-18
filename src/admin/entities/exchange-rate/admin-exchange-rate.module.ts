import { Module } from '@nestjs/common'

import { ExchangeRateRepository } from '../../../repositories'

import { AdminExchangeRateController } from './admin-exchange-rate.controller'
import { AdminExchangeRateService } from './admin-exchange-rate.service'

@Module({
  controllers: [AdminExchangeRateController],
  providers: [ExchangeRateRepository, AdminExchangeRateService],
  exports: [ExchangeRateRepository, AdminExchangeRateService],
})
export class AdminExchangeRateModule {}
