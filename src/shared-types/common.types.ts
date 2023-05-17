import { SortDirection, SortNulls } from './enum-like'

export type SortField<T> = { field: keyof T; direction: SortDirection; nulls?: SortNulls }
export type Paging = { limit?: number; offset?: number }
export type Query<T> = { paging?: Paging; sorting?: SortField<T>[] }
export type IFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }
export type IQuery<TModel> = Query<TModel> & { filter: IFilter<TModel> }
