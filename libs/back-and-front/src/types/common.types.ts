import { SortDirection, SortNulls } from './enum-like'

export type Nullable<T> = T | null
export type Unassignable<T> = T | undefined
export type Nillable<T> = Nullable<T> | Unassignable<T>
export type Generic = { [key: string]: any }
export type ValueOf<T> = T[keyof T]
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T
export type DeepPartialGeneric<T extends Generic = Generic> = DeepPartial<T>

export type SortField<T> = { field: keyof T; direction: SortDirection; nulls?: SortNulls }
export type Paging = { limit?: number; offset?: number }
export type Query<T> = { paging?: Paging; sorting?: SortField<T>[] }
export type IFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }
export type IQuery<TModel> = Query<TModel> & { filter?: IFilter<TModel> }
export type KnexCount = { count: number }
