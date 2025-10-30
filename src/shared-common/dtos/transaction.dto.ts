import type { ITransactionModel } from '../models/transaction.model'
import type { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type ITransactionResponse = WithoutDeletedAt<ITransactionModel>
export type ITransactionCreate = OnlyUpsertFields<WithoutDeletedAt<ITransactionModel>>
export type ITransactionUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<ITransactionModel>>>
