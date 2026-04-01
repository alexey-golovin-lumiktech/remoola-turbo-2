import { type IGoogleProfileDetailsModel } from '../models/google-profile-details.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IGoogleProfileDetailsResponse = WithoutDeletedAt<IGoogleProfileDetailsModel>;
export type IGoogleProfileDetailsCreate = OnlyUpsertFields<WithoutDeletedAt<IGoogleProfileDetailsModel>>;
export type IGoogleProfileDetailsUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IGoogleProfileDetailsModel>>>;
