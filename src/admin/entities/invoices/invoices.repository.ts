import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { IInvoiceModel, TableName } from 'src/models'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Invoices)
  }
}
