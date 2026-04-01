import { type IAddressDetailsModel } from '../models/address-details.model';
import { type OnlyUpsertFields, type WithoutDeletedAt } from '../types';

export type IAddressDetailsResponse = WithoutDeletedAt<IAddressDetailsModel>;
export type IAddressDetailsCreate = OnlyUpsertFields<WithoutDeletedAt<IAddressDetailsModel>>;
export type IAddressDetailsUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IAddressDetailsModel>>>;
