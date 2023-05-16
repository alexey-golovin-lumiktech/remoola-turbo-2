import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { IBillingDetailsModel, TableName } from 'src/models'

@Injectable()
export class BillingDetailsRepository extends BaseRepository<IBillingDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.BillingDetails)
  }
}
