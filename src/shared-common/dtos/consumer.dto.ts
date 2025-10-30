import type { IConsumerModel } from '../models/consumer.model'
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IConsumerResponse = WithoutDeletedAt<IConsumerModel>
export type IConsumerCreate = OnlyUpsertFields<WithoutDeletedAt<IConsumerModel>>
export type IConsumerUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IConsumerModel>>>

export type ILoginResponse = IConsumerResponse & { accessToken: string; refreshToken: string }
export type ISignupRequest = Pick<
  IConsumerResponse,
  | `accountType` //
  | `contractorKind`
  | `email`
  | `firstName`
  | `lastName`
  | `password`
>
