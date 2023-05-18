import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IInvoiceModel, TABLES } from '../../../models'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TABLES.Invoices)
  }
}
