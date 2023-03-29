import { Query } from '@nestjs-query/core'

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
