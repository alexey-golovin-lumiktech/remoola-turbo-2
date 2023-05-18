import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { IInvoiceModel, TABLES } from '../../../models'
import { IQuery } from '../../../shared-types'
import { getKnexCount } from '../../../utils'
import { ChainedQB } from '../../../utils/chained-query-builder'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  private readonly mode: string

  constructor(@InjectKnex() knex: Knex, private readonly configService: ConfigService) {
    super(knex, TABLES.Invoices)
    this.mode = this.configService.get<string>(`NODE_ENV`)
  }

  async findAndCountAll(query?: IQuery<IInvoiceModel>): Promise<CONSUMER.InvoicesList> {
    const baseQuery = this.knex.from(`${TABLES.Invoices} as i`).modify(qb => new ChainedQB(qb).filter(query?.filter ?? {}))

    const count = await baseQuery.clone().count().then(getKnexCount)

    const data = await baseQuery
      .clone()
      .join(`${TABLES.Consumers} as cr`, `cr.id`, `i.creator_id`)
      .join(`${TABLES.Consumers} as ref`, `ref.id`, `i.referer_id`)
      .select(`i.*`, `cr.email as creator`, `ref.email as referer`)
      .modify(qb => new ChainedQB(qb).order(query?.sorting ?? []).paging(query?.paging ?? {}))

    return { count, data }
  }
}
