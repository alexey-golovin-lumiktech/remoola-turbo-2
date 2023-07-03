import { IGoogleProfileModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IGoogleProfileResponse = WithoutDeletedAt<IGoogleProfileModel>
export type IUpsertGoogleProfile = OnlyUpsertFields<IGoogleProfileResponse>
