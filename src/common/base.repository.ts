import type { Knex as IKnex } from 'knex'
import { Knex } from 'knex'
import { isEmpty, isNil, snakeCase } from 'lodash'

import { ListResponse } from 'src/dtos/common'
import { IBaseModel, ITableName } from 'src/models'
import { IFilter, IQuery } from 'src/shared-types'
import { getKnexCount, queryBuilder } from 'src/utils'

export interface IBaseRepository<TModel extends IBaseModel> {
  create(dto: Partial<TModel>): Promise<TModel>
  createMany(dto: Partial<TModel>[]): Promise<TModel[]>

  find(query?: IQuery<TModel>): Promise<TModel[]>
  findById(id: string): Promise<TModel | null>
  findAndCountAll(query?: IQuery<TModel>): Promise<{ data: TModel[]; count: number }>

  update(filter: IFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]>
  updateById(id: string, dto: Partial<TModel>): Promise<TModel | null>

  softDelete(filter: IFilter<TModel>): Promise<TModel[]>
  softDeleteById(id: string): Promise<TModel | null>
}

export abstract class BaseRepository<TModel extends IBaseModel> implements IBaseRepository<TModel> {
  private columns: string[] = []

  constructor(public readonly knex: Knex, private readonly tableName: ITableName) {
    this.tableName = tableName
    knex(tableName).columnInfo().then(info => this.columns = Object.keys(info)) /* eslint-disable-line */
  }

  get qb() { return this.knex.from(this.tableName) } /* eslint-disable-line */

  queryBuilder(query: IQuery<TModel>) {
    const buildWhere = (q: IKnex.QueryBuilder, filter: IFilter<TModel>) => {
      if (!filter) return
      const entries = Object.entries(filter)
      for (const [attr, value] of entries) {
        if (isNil(value)) continue
        if (!this.columns.includes(attr)) throw new Error(`Wrong call repository method`)

        let raw = ``
        if (Array.isArray(value)) raw += `${snakeCase(attr)} IN(${queryBuilder.makeSqlIn(value)})`
        else raw += `${snakeCase(attr)} = '${String(value)}'`
        if (!isEmpty(raw.trim()) && raw.includes(String(value))) q.andWhereRaw(raw)
      }
    }

    const build = (q: IKnex.QueryBuilder): IKnex.QueryBuilder => {
      buildWhere(q, query?.filter ?? {})

      for (const { field: attr, direction } of query?.sorting ?? []) {
        if (!attr || !direction) continue
        q.orderBy(snakeCase(String(attr)), direction)
      }

      if (query?.paging?.limit) q.limit(query.paging.limit)
      if (query?.paging?.offset) q.offset(query.paging.offset)

      return q
    }

    return { buildWhere, build }
  }

  async findAndCountAll(query?: IQuery<TModel>): Promise<ListResponse<TModel>> {
    const data = await this.find(query)
    const qb = this.qb.clone() /* @IMPORTANT_NOTE baseQuery.clone() is required */
    if (query) this.queryBuilder({ filter: query.filter }).build(qb)
    const count = await qb.count().then(getKnexCount)
    return { count, data }
  }

  async find(query?: IQuery<TModel>): Promise<TModel[]> {
    const qb = this.qb.clone()
    if (query) this.queryBuilder(query).build(qb)
    const data = await qb
    return data
  }

  async findById(id: string): Promise<TModel | null> {
    const [found] = await this.find({ filter: { id } })
    return found ?? null
  }

  update(filter: IFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]> {
    return this.qb.clone().where(filter).update(dto).returning(`*`)
  }

  async updateById(id: string, dto: Partial<TModel>): Promise<TModel> {
    const [updated] = await this.update({ id }, dto)
    return updated
  }

  softDelete(filter: IFilter<TModel>): Promise<TModel[]> {
    // @TYPESCRIPT_ERR https://stackoverflow.com/questions/59279796/typescript-partial-of-a-generic-type
    const softDeleteDto = Object.assign({} as Partial<TModel>, { deletedAt: new Date() })
    return this.update(filter, softDeleteDto)
  }

  async softDeleteById(id: string): Promise<TModel> {
    const [deleted] = await this.softDelete({ id })
    return deleted
  }

  async create(dto: Partial<TModel>): Promise<TModel> {
    const [created] = await this.createMany([dto])
    return created
  }

  async createMany(dto: Partial<TModel>[]): Promise<TModel[]> {
    const created = await this.knex.insert(dto).into(this.tableName).returning(`*`)
    return created
  }
}
