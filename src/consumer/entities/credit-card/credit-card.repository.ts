import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { ICreditCardModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class CreditCardRepository extends BaseRepository<ICreditCardModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.CreditCard)
  }
}
