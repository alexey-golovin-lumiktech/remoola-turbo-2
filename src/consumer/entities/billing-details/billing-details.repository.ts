import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common/base.repository'
import { IBillingDetailsModel, TableName } from '../../../models'

@Injectable()
export class BillingDetailsRepository extends BaseRepository<IBillingDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.BillingDetails)
  }
}
