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

export type IFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }

export type IQuery<TModel> = Pick<Query<TModel>, `sorting` | `paging`> & { filter: IFilter<TModel> }

export enum SwaggerDocExpansion {
  Full = `full`,
  None = `none`,
  List = `list`
}
