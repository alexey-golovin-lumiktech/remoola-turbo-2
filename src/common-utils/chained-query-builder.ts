import type { Knex as IKnex } from 'knex'
import { isEmpty, isNil, snakeCase } from 'lodash'

import { dbQuerying } from './db-querying'

export class ChainedQB {
  constructor(private readonly qb: IKnex.QueryBuilder<{}, any>) {}

  filter = (filter = {}) => {
    let raw = ``
    for (const [field, value] of Object.entries(filter)) {
      if (isNil(value)) continue
      if (Array.isArray(value)) raw += `${snakeCase(field)} IN(${dbQuerying.makeSqlIn(value)})`
      else raw += `${snakeCase(field)} = '${String(value)}'`
      if (!isEmpty(raw.trim())) this.qb.andWhereRaw(raw)
    }
    return this
  }

  order = (sorting = []) => {
    sorting.forEach(({ field, direction }) => !field || !direction || this.qb.orderBy(String(field), direction))
    return this
  }

  paging = (paging?: { limit?: number; offset?: number }) => {
    if (!isNil(paging.limit)) this.qb.limit(paging.limit)
    if (!isNil(paging.offset)) this.qb.offset(paging.offset)
    return this
  }
}
