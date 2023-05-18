import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { CONSUMER } from 'src/dtos'
import { IInvoiceModel, TableName } from 'src/models'
import { IQuery } from 'src/shared-types'
import { getKnexCount } from 'src/utils'
import { ChainedQB } from 'src/utils/chained-query-builder'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  private readonly mode: string

  constructor(@InjectKnex() knex: Knex, private readonly configService: ConfigService) {
    super(knex, TableName.Invoices)
    this.mode = this.configService.get<string>(`NODE_ENV`)
  }

  async findAndCountAll(query?: IQuery<IInvoiceModel>): Promise<CONSUMER.InvoicesList> {
    const baseQuery = this.knex.from(`${TableName.Invoices} as i`).modify(qb => new ChainedQB(qb).filter(query?.filter ?? {}))

    const count = await baseQuery.clone().count().then(getKnexCount)

    const data = await baseQuery
      .clone()
      .join(`${TableName.Consumers} as cr`, `cr.id`, `i.creator_id`)
      .join(`${TableName.Consumers} as ref`, `ref.id`, `i.referer_id`)
      .select(`i.*`, `cr.email as creator`, `ref.email as referer`)
      .modify(qb => new ChainedQB(qb).order(query?.sorting ?? []).paging(query?.paging ?? {}))

    return { count, data }
  }
}
