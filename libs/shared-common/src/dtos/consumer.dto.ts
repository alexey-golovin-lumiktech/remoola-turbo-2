import { IConsumerModel } from '../models'
import { WithoutDeletedAt } from '../types'

export type IConsumerResponse = WithoutDeletedAt<IConsumerModel>
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
