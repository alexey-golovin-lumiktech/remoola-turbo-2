import type { Knex as IKnex } from 'knex'
import { Knex } from 'knex'
import snakeCase from 'lodash/snakeCase'

import { IListResponse } from '../dtos'
import { IBaseModel } from '../models'

import { IFilter, IQuery } from './base.types'

export interface IBaseRepository<TModel> {
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
  protected tableName: string
  protected knexQb: IKnex.QueryBuilder
  protected columns: string[]

  constructor(knex: Knex, tableName: string) {
    this.tableName = tableName
    this.knexQb = knex<TModel, TModel[]>(this.tableName)
    setImmediate(async () => {
      const info = await knex(this.tableName).columnInfo()
      this.columns = Object.keys(info)
    })
  }

  queryBuilder(query: IQuery<TModel>) {
    const buildWhere = (q: IKnex.QueryBuilder<TModel>, filter: IFilter<TModel>) => {
      if (!filter) return
      const entries = Object.entries(filter)
      for (const entry of entries) {
        const [column, value] = entry
        if (!this.columns.includes(column)) throw new Error(`Wrong call repository method`)
        q.andWhere({ [column]: value })
      }
    }

    const build = (q: IKnex.QueryBuilder<TModel>): IKnex.QueryBuilder<TModel> => {
      if (query?.filter) buildWhere(q, query.filter)
      if (query?.paging?.limit) q.limit(query.paging.limit)
      if (query?.paging?.offset) q.offset(query.paging.offset)
      if (query?.sorting) query.sorting.forEach(({ field, direction }) => q.orderBy(String(field), direction))
      return q
    }

    return { buildWhere, build }
  }

  get query() {
    return this.knexQb.clone()
  }

  private makeSqlIn(arr: (string | number)[]): string {
    return arr.map(x => `'${x}'`).join(`,`)
  }

  async findAndCountAll(query?: IQuery<TModel>): Promise<IListResponse<TModel>> {
    const data = await this.query.modify(qb => {
      if (query?.filter) {
        const raw = Object.entries(query.filter).reduce((acc, [field, value]) => {
          if (Array.isArray(value) && typeof value != `string`) acc += `${field} IN(${this.makeSqlIn(value)})`
          else acc += `${snakeCase(field)} = '${value}'`
          return acc
        }, ``)
        qb.whereRaw(raw)
      }

      if (query?.sorting) query.sorting.forEach(({ field, direction }) => qb.orderBy(String(field), direction))

      if (query?.paging) {
        if (query.paging?.limit) qb.limit(query.paging.limit)
        if (query.paging?.offset) qb.offset(query.paging.offset)
      }
    })

    const count = await this.query.count().then(([{ count }]) => count)
    return { count, data }
  }

  async find(query?: IQuery<TModel>): Promise<TModel[]> {
    const qbClone = this.query
    if (query) this.queryBuilder(query).build(qbClone)
    const data = await qbClone
    return data
  }

  async findById(id: string): Promise<TModel | null> {
    const [found] = await this.find({ filter: { id } })
    return found ?? null
  }

  update(filter: IFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]> {
    return this.query.where(filter).update(dto).returning(`*`)
  }

  async updateById(id: string, dto: Partial<TModel>): Promise<TModel> {
    const [updated] = await this.update({ id }, dto)
    return updated
  }

  softDelete(filter: IFilter<TModel>): Promise<TModel[]> {
    return this.update(filter, { deletedAt: new Date() } as Partial<TModel>)
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
    const created = await this.knexQb.clone().insert(dto).returning(`*`)
    return created
  }
}
