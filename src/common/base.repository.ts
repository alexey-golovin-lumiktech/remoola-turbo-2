import type { Knex as IKnex } from 'knex'
import { Knex } from 'knex'
import { isEmpty, isNil, snakeCase } from 'lodash'

import { IBaseModel, TableNameValue } from '@wirebill/shared-common/models'
import { ReqQuery, ReqQueryFilter } from '@wirebill/shared-common/types'

import { ListResponse } from '../dtos/common'
import { getKnexCount, queryBuilder } from '../utils'

export interface IBaseRepository<TModel extends IBaseModel> {
  create(dto: Partial<TModel>): Promise<TModel>
  createMany(dto: Partial<TModel>[]): Promise<TModel[]>

  find(query: ReqQuery<TModel>): Promise<TModel[]>
  findById(id: string): Promise<TModel | null>
  findAndCountAll(query: ReqQuery<TModel>): Promise<{ data: TModel[]; count: number }>

  update(filter: ReqQueryFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]>
  updateById(id: string, dto: Partial<TModel>): Promise<TModel | null>

  softDelete(filter: ReqQueryFilter<TModel>): Promise<TModel[]>
  softDeleteById(id: string): Promise<TModel | null>
}

export abstract class BaseRepository<TModel extends IBaseModel> implements IBaseRepository<TModel> {
  private columns: string[] = []

  constructor(public readonly knex: Knex, private readonly tableName: TableNameValue) {
    this.tableName = tableName
    knex(tableName).columnInfo().then(info => this.columns = Object.keys(info)) /* eslint-disable-line */
  }

  get qb() { return this.knex.from(this.tableName) } /* eslint-disable-line */

  queryBuilder(query: ReqQuery<TModel> = {}) {
    const buildWhere = (q: IKnex.QueryBuilder, filter: ReqQueryFilter<TModel>) => {
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
      buildWhere(q, { ...query?.filter })

      if (query.comparisonFilters != null) {
        for (const { field, comparison, value } of query.comparisonFilters) {
          q.andWhereRaw(`${snakeCase(String(field))} ${comparison} ${value}`)
        }
      }

      if (query.sorting != null) {
        for (const { field: attr, direction } of query.sorting) {
          if (!attr || !direction) continue
          q.orderBy(snakeCase(String(attr)), direction)
        }
      }

      if (query.paging?.limit) q.limit(query.paging.limit)
      if (query.paging?.offset) q.offset(query.paging.offset)

      return q
    }

    return { buildWhere, build }
  }

  async findAndCountAll(query: ReqQuery<TModel> = {}): Promise<ListResponse<TModel>> {
    const qb = this.qb.clone() /* @IMPORTANT_NOTE baseQuery.clone() is required */
    const count = await qb.count().then(getKnexCount) /* @IMPORTANT_NOTE qb.count() should be called before queryBuilder */

    if (query) {
      this.queryBuilder({
        filter: query.filter ?? {},
        comparisonFilters: query.comparisonFilters ?? [],
        sorting: query.sorting ?? [],
        paging: query.paging ?? {},
      }).build(qb)
    }

    const data = await this.find(query)
    return { count, data }
  }

  async find(query: ReqQuery<TModel> = {}): Promise<TModel[]> {
    const qb = this.qb.clone()

    if (query) {
      this.queryBuilder({
        filter: query.filter ?? {},
        comparisonFilters: query.comparisonFilters ?? [],
        sorting: query.sorting ?? [],
        paging: query.paging ?? {},
      }).build(qb)
    }

    const data = await qb
    return data
  }

  async findById(id: string): Promise<TModel | null> {
    const [found] = await this.find({ filter: { id } })
    return found ?? null
  }

  update(filter: ReqQueryFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]> {
    return this.qb.clone().where(filter).update(dto).returning(`*`)
  }

  async updateById(id: string, dto: Partial<TModel>): Promise<TModel> {
    const [updated] = await this.update({ id }, dto)
    return updated
  }

  softDelete(filter: ReqQueryFilter<TModel>): Promise<TModel[]> {
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
