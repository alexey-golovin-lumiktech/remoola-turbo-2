import { SortDirectionValue, SortNullsValue } from './enum-like'

export type ListQueryPaging = { limit?: number; offset?: number }
export type ListQueryFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }
export type ListQuerySorting<TModel> = { field: keyof TModel; direction: SortDirectionValue; nulls?: SortNullsValue }
export type ListQuery<TModel> = { paging?: ListQueryPaging; sorting?: ListQuerySorting<TModel>[]; filter?: ListQueryFilter<TModel> }

export type KnexCount = { count: number }
export type ObjectKey<TObject> = keyof TObject
