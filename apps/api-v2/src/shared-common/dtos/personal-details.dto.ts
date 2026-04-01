import { type IPersonalDetailsModel } from '../models/personal-details.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IPersonalDetailsResponse = WithoutDeletedAt<IPersonalDetailsModel>;
export type IPersonalDetailsCreate = OnlyUpsertFields<WithoutDeletedAt<IPersonalDetailsModel>>;
export type IPersonalDetailsUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IPersonalDetailsModel>>>;
