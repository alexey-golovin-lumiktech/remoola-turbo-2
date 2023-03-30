export declare enum SortDirection {
  ASC = `ASC`,
  DESC = `DESC`
}

export declare enum SortNulls {
  NULLS_FIRST = `NULLS FIRST`,
  NULLS_LAST = `NULLS LAST`
}

export interface SortField<T> {
  field: keyof T
  direction: SortDirection
  nulls?: SortNulls
}
export interface Paging {
  limit?: number
  offset?: number
}

export interface Query<T> {
  paging?: Paging
  sorting?: SortField<T>[]
}

export type IFilter<TModel> = { [K in keyof (TModel | object)]?: TModel[K] | string | symbol | number }

export type IQuery<TModel> = Pick<Query<TModel>, `sorting` | `paging`> & { filter: IFilter<TModel> }

export type PrimitiveValue = string | number | boolean | Date | null | Buffer

export type ComparisonOperator = `=` | `>` | `>=` | `<` | `<=` | `<>`

export enum FilteringOperator {
  Or = `OR`,
  And = `AND`,
  Like = `LIKE`,
  ILike = `ILIKE`,
  NotLike = `NOT LIKE`,
  NotILike = `NOT ILIKE`,
  Is = `=`,
  Eq = `=`,
  IsNot = `NOT`,
  Neq = `<>`,
  Gt = `>`,
  Gte = `>=`,
  Lt = `<`,
  Lte = `<=`,
  In = `IN`,
  NotIn = `NOT IN`,
  Between = `between`,
  NotBetween = `NOT BETWEEN`
}
