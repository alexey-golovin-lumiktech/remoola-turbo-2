/* eslint-disable simple-import-sort/imports */
import type { WithoutDeletedAt } from '../types'
import type { IResetPasswordModel } from '../models/reset-password.model'
import type { IConsumerModel } from '../models/consumer.model'

export type IResetPassword = WithoutDeletedAt<IResetPasswordModel>
export type IChangePasswordBody = Partial<Pick<IConsumerModel, `email` | `password`>>
export type IChangePasswordParam = Required<{ token: string }>
