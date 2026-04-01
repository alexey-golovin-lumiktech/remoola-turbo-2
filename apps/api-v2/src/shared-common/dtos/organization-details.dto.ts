import { type IOrganizationDetailsModel } from '../models/organization-details.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IOrganizationDetailsResponse = WithoutDeletedAt<IOrganizationDetailsModel>;
export type IOrganizationDetailsCreate = OnlyUpsertFields<WithoutDeletedAt<IOrganizationDetailsModel>>;
export type IOrganizationDetailsUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IOrganizationDetailsModel>>>;
