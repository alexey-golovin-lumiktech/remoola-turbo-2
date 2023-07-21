import type { Knex as IKnex } from 'knex'
import { Knex } from 'knex'
import { isEmpty, isEqual, isNil, snakeCase } from 'lodash'
import moment from 'moment'

import { IBaseModel, TableNameValue } from '@wirebill/shared-common/models'
import { ReqQuery, ReqQueryComparisonFilter, ReqQueryFilter } from '@wirebill/shared-common/types'

import { ListResponse } from '../dtos/common'
import { getKnexCount, queryBuilder } from '../utils'

export interface IBaseRepository<TModel extends IBaseModel> {
  create(dto: Partial<TModel>): Promise<TModel>
  createMany(dto: Partial<TModel>[]): Promise<TModel[]>

  find(query: ReqQuery<TModel>): Promise<TModel[]>
  findOne(filter: ReqQueryFilter<TModel>): Promise<Nullable<TModel>>
  findById(id: string): Promise<TModel | null>
  findAndCountAll(query: ReqQuery<TModel>): Promise<{ data: TModel[]; count: number }>

  update(filter: ReqQueryFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]>
  updateById(id: string, dto: Partial<TModel>): Promise<TModel | null>

  softDelete(filter: ReqQueryFilter<TModel>): Promise<TModel[]>
  softDeleteById(id: string): Promise<TModel | null>

  deleteById(id: string): Promise<boolean>
  deleteManyById(ids: string[]): Promise<boolean>
}

export abstract class BaseRepository<TModel extends IBaseModel> implements IBaseRepository<TModel> {
  constructor(public readonly knex: Knex, private readonly tableName: TableNameValue) {}

  get qb() { return this.knex.from(this.tableName) } /* eslint-disable-line */

  queryBuilder(query: ReqQuery<TModel> = {}, columns: string[]) {
    const buildWhere = (q: IKnex.QueryBuilder, filter: ReqQueryFilter<TModel>) => {
      if (!filter) return
      const entries = Object.entries(filter)
      for (const [attr, value] of entries) {
        if (isNil(value)) continue
        if (!columns.includes(attr)) {
          throw new Error(
            `Wrong call repository method, table: ${this.tableName}, columns: ${JSON.stringify(
              columns,
              null,
              -1,
            )}, attr: ${attr}, value:${value}`,
          )
        }

        let raw = ``
        if (Array.isArray(value)) raw += `${snakeCase(attr)} IN(${queryBuilder.makeSqlIn(value)})`
        else raw += `${snakeCase(attr)} = '${String(value)}'`
        if (!isEmpty(raw.trim()) && raw.includes(String(value))) q.andWhereRaw(raw)
      }

      return q
    }

    const build = (q: IKnex.QueryBuilder): IKnex.QueryBuilder => {
      buildWhere(q, { ...query?.filter })

      if ((query.comparisonFilters || []).every(x => isEqual(Object.keys(x).sort(), [`field`, `comparison`, `value`].sort()))) {
        for (const { field, comparison, value } of query.comparisonFilters) {
          if (value instanceof Date) {
            q.andWhereRaw(`${snakeCase(String(field))} ${comparison} '${moment(value).format(`YYYY-MM-DD HH:mm:ss`)}'`)
          } else q.andWhereRaw(`${snakeCase(String(field))} ${comparison} ${value}`)
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

  private getColumns(table: TableNameValue) {
    return this.knex.from(table).columnInfo().then(info => Object.keys(info))/* eslint-disable-line */
  }

  async findAndCountAll(query: ReqQuery<TModel> = {}): Promise<ListResponse<TModel>> {
    const columns = await this.getColumns(this.tableName)
    const qb = this.qb.clone() /* @IMPORTANT_NOTE baseQuery.clone() is required */
    const count = await qb.count().then(getKnexCount) /* @IMPORTANT_NOTE qb.count() should be called before queryBuilder */

    if (query) {
      this.queryBuilder(
        {
          filter: query.filter ?? {},
          comparisonFilters: query.comparisonFilters ?? [],
          sorting: query.sorting ?? [],
          paging: query.paging ?? {},
        },
        columns,
      ).build(qb)
    }

    const data: TModel[] = await this.find(query)
    return { count, data }
  }

  async find(query: ReqQuery<TModel> = {}): Promise<TModel[]> {
    const columns = await this.getColumns(this.tableName)
    const qb = this.qb.clone()

    if (query) {
      this.queryBuilder(
        {
          filter: query.filter ?? {},
          comparisonFilters: query.comparisonFilters ?? [],
          sorting: query.sorting ?? [],
          paging: query.paging ?? {},
        },
        columns,
      ).build(qb)
    }

    const data: TModel[] = await qb
    return data
  }

  async findOne(filter: ReqQueryFilter<TModel>, comparisonFilter?: ReqQueryComparisonFilter<TModel>): Promise<Nullable<TModel>> {
    const columns = await this.getColumns(this.tableName)
    const qb = this.qb.clone()
    if (filter) this.queryBuilder({ filter: filter ?? {}, comparisonFilters: [comparisonFilter].filter(Boolean) }, columns).build(qb)
    const data: TModel = await qb.first()
    return data ?? null
  }

  findById(id: string): Promise<TModel | null> {
    return this.findOne({ id })
  }

  async update(filter: ReqQueryFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]> {
    const updated: TModel[] = await this.qb.clone().where(filter).update(dto).returning(`*`)
    return updated
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
    const [created]: TModel[] = await this.createMany([dto])
    return created
  }

  createMany(dto: Partial<TModel>[]): Promise<TModel[]> {
    return this.knex.insert(dto).into(this.tableName).returning(`*`)
  }

  deleteById(id: string): Promise<boolean> {
    return this.deleteManyById([id])
  }

  deleteManyById(ids: string[]): Promise<boolean> {
    return this.qb.clone().whereIn(`id`, ids).del()
  }
}
