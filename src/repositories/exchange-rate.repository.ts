import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IExchangeRateModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class ExchangeRateRepository extends BaseRepository<IExchangeRateModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.ExchangeRate)
  }
}
