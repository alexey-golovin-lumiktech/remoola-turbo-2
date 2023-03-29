import type { Knex as IKnex } from 'knex'
import { Knex } from 'knex'
import { IBaseModel } from 'src/models/base'
import { IQuery, IFilter, FilteringOperator } from './types'

export interface IBaseRepository<TModel> {
  create(dto: Partial<TModel>): Promise<TModel>
  createMany(dto: Partial<TModel>[]): Promise<TModel[]>

  find(query?: IQuery<TModel>): Promise<TModel[]>
  findById(id: string): Promise<TModel | null>
  findAndCountAll(query?: IQuery<TModel>): Promise<{ data: TModel[]; count: number }>

  update(filter: IFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]>
  updateById(id: string, dto: Partial<TModel>): Promise<TModel | null>

  delete(filter: IFilter<TModel>): Promise<TModel[]>
  deleteById(id: string): Promise<TModel | null>
}

export abstract class BaseRepository<TModel extends IBaseModel> implements IBaseRepository<TModel> {
  protected tableName: string
  protected knexQb: IKnex.QueryBuilder
  protected tableColumns: string[]
  protected sqlOperators = Object.keys(FilteringOperator).map((x) => x.toLowerCase())

  constructor(knex: Knex, tableName: string) {
    this.tableName = tableName
    this.knexQb = knex<TModel, TModel[]>(this.tableName)
    knex(this.tableName).columnInfo().then((x) => (this.tableColumns = Object.keys(x)))// eslint-disable-line prettier/prettier
  }

  queryBuilder(query: IQuery<TModel>) {
    const _convert = (obj: IFilter<TModel>, key: string): any => obj[key] || {}

    const buildWhere = (q: IKnex.QueryBuilder<TModel>, field: string, filter?: IFilter<TModel>) => {
      if (!filter) return

      const withOp = this.sqlOperators.some((op) => JSON.stringify(filter).toLowerCase().includes(op))
      const [entry] = withOp ? Object.entries(_convert(filter, field)) : Object.entries(filter)
      if (!entry) return

      const [operatorOrColumnName, value] = entry
      const containOneOfSqlOp = this.sqlOperators.some((x) => x.toLowerCase() == operatorOrColumnName.toLowerCase())
      const isColumnName = this.tableColumns.includes(operatorOrColumnName)
      if (isColumnName && !containOneOfSqlOp) return q.where({ [operatorOrColumnName]: value })

      if (operatorOrColumnName == `eq` || operatorOrColumnName == `is`) q.whereRaw(`${field} = '${value}'`)
      if (operatorOrColumnName == `in` && Array.isArray(value)) q.whereRaw(`${field} IN(${this.makeSqlIn(value)})`)
      if (operatorOrColumnName == `ilike` || operatorOrColumnName == `like`) q.whereRaw(`${field} ${operatorOrColumnName} '%${value}%'`)
    }

    const _buildNestedWhereThrough = (filter: IFilter<TModel>) => (q: IKnex.QueryBuilder<TModel>) =>
      Object.keys(filter).forEach((innerField) => buildWhere(q, innerField, filter))

    const build = (q: IKnex.QueryBuilder<TModel>): IKnex.QueryBuilder<TModel> => {
      if (query?.filter) {
        for (const filterField in query.filter) {
          if (filterField == `or` || filterField == `and`) {
            const nested = query.filter[filterField]
            if (nested) for (const filter of nested) q[`${filterField}Where`](_buildNestedWhereThrough(filter))
          } else buildWhere(q, filterField, query.filter)
        }
      }

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
    return arr.map((x) => `'${x}'`).join(`,`)
  }

  async findAndCountAll(query?: IQuery<TModel>): Promise<{ data: TModel[]; count: number }> {
    const qbClone = this.query
    if (query) this.queryBuilder(query).build(qbClone)
    const data = await qbClone

    const count = await this.query.count().then(([{ count }]) => count)
    return { count, data }
  }

  async find(query?: IQuery<TModel>): Promise<TModel[]> {
    const qbClone = this.query
    if (query) this.queryBuilder(query).build(qbClone)
    const data = await qbClone
    return data
  }

  async findById(id: string): Promise<TModel> {
    const [found] = await this.find({ filter: { id } })
    return found
  }

  update(filter: IFilter<TModel>, dto: Partial<TModel>): Promise<TModel[]> {
    const qbClone = this.query
    this.queryBuilder({ filter }).build(qbClone)
    return qbClone.update(dto).returning(`*`)
  }

  async updateById(id: string, dto: Partial<TModel>): Promise<TModel> {
    const [updated] = await this.update({ id }, dto)
    return updated
  }

  delete(filter: IFilter<TModel>): Promise<TModel[]> {
    return this.update(filter, { deletedAt: new Date() } as Partial<TModel>)
  }

  async deleteById(id: string): Promise<TModel> {
    const [deleted] = await this.delete({ id })
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
