import { IPersonalDetailsModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IPersonalDetailsResponse = WithoutDeletedAt<IPersonalDetailsModel>
export type IUpsertPersonalDetails = OnlyUpsertFields<IPersonalDetailsResponse>
