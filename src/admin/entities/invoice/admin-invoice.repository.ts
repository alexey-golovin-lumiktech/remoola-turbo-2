import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IInvoiceModel, TableName } from '../../../models'

@Injectable()
export class AdminInvoiceRepository extends BaseRepository<IInvoiceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Invoice)
  }
}
