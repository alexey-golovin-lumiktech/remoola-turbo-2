import { Inject, Injectable } from '@nestjs/common'

import { IExchangeRateModel } from '@wirebill/shared-common/models'

import { BaseService } from '@-/common'
import { ExchangeRateRepository } from '@-/repositories'

@Injectable()
export class AdminExchangeRateService extends BaseService<IExchangeRateModel, ExchangeRateRepository> {
  constructor(@Inject(ExchangeRateRepository) repository: ExchangeRateRepository) {
    super(repository)
  }
}
