import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IBillingDetailsModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class BillingDetailsRepository extends BaseRepository<IBillingDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.BillingDetails)
  }
}
