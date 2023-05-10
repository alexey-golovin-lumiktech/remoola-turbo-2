import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common/base.repository'
import { IInvoiceModel, TableName } from '../../../models'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Invoices)
  }
}
