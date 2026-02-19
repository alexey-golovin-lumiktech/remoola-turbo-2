import { type IAddressDetailsModel } from './address-details.model';
import { type IBaseModel } from './base.model';

export type IContactModel = {
  consumerId: string;
  email: string;
  name?: string;
  address: Omit<IAddressDetailsModel, keyof IBaseModel | `consumerId`>;
} & IBaseModel;
