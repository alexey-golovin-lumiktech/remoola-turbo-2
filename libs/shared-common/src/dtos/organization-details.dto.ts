import { IOrganizationDetailsModel } from '../models'
import { OnlyUpsertFields, WithoutDeletedAt } from '../types'

export type IOrganizationDetailsResponse = WithoutDeletedAt<IOrganizationDetailsModel>
export type IUpsertOrganizationDetails = OnlyUpsertFields<IOrganizationDetailsResponse>
