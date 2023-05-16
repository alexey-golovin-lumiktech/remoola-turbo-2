import { ValueOf } from 'src/shared-types'

export const sortDirection = { ASC: `ASC`, DESC: `DESC` } as const
export const sortNulls = { NULLS_FIRST: `NULLS FIRST`, NULLS_LAST: `NULLS LAST` } as const
export const swaggerDocExpansion = { Full: `full`, None: `none`, List: `list` } as const

export type SortField<T> = { field: keyof T; direction: ValueOf<typeof sortDirection>; nulls?: ValueOf<typeof sortNulls> }
export type Paging = { limit?: number; offset?: number }
export type Query<T> = { paging?: Paging; sorting?: SortField<T>[] }
export type IFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }
export type IQuery<TModel> = Pick<Query<TModel>, `sorting` | `paging`> & { filter: IFilter<TModel> }
