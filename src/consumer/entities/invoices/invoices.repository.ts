import { Injectable } from '@nestjs/common'
import { snakeCase } from 'lodash'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { CommonDTOS, ConsumerDTOS } from 'src/dtos'
import { IInvoiceModel, TableName } from 'src/models'
import { IQuery } from 'src/shared-types'
import { queryBuilder } from 'src/utils'

@Injectable()
export class InvoicesRepository extends BaseRepository<IInvoiceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Invoices)
  }

  async findAndCountAll(query?: IQuery<IInvoiceModel>): Promise<CommonDTOS.ListResponseDTO<ConsumerDTOS.InvoiceResponse>> {
    const modify = qb => {
      if (query?.filter) {
        const raw = Object.entries(query.filter).reduce((acc, [field, value]) => {
          if (Array.isArray(value) && typeof value != `string`) acc += `${field} IN(${queryBuilder.makeSqlIn(value)})`
          else acc += `${snakeCase(field)} = '${String(value)}'`
          return acc
        }, ``)
        qb.whereRaw(raw)
      }

      if (query?.sorting) query.sorting.forEach(({ field, direction }) => qb.orderBy(String(field), direction))

      if (query?.paging) {
        if (query.paging?.limit) qb.limit(query.paging.limit)
        if (query.paging?.offset) qb.offset(query.paging.offset)
      }
    }

    const data = await this.query
      .clone()
      .join(`${TableName.Consumers} as creator`, `creator.id`, `invoices.creator_id`)
      .join(`${TableName.Consumers} as referer`, `referer.id`, `invoices.referer_id`)
      .select(`${this.tableName}.*`, `creator.email as creator`, `referer.email as referer`)
      .modify(modify)

    const count = await this.query
      .clone()
      .modify(qb => {
        if (query?.filter) {
          const raw = Object.entries(query.filter).reduce((acc, [field, value]) => {
            if (Array.isArray(value) && typeof value != `string`) acc += `${field} IN(${queryBuilder.makeSqlIn(value)})`
            else acc += `${snakeCase(field)} = '${String(value)}'`
            return acc
          }, ``)
          qb.whereRaw(raw)
        }
      })
      .count()
      .then(([{ count }]) => count)

    return { count, data }
  }
}
