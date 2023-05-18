import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IBillingDetailsModel, TABLES } from '../../../models'

@Injectable()
export class BillingDetailsRepository extends BaseRepository<IBillingDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TABLES.BillingDetails)
  }
}
