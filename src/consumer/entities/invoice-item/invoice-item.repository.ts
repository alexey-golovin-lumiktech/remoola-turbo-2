import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IInvoiceItemModel, TableName } from '../../../models'

@Injectable()
export class InvoiceItemRepository extends BaseRepository<IInvoiceItemModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.InvoiceItem)
  }
}
