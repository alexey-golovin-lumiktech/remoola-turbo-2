import type { IBaseModel } from './base.model';

export type IAddressDetailsModel = {
  postalCode: string;
  country: string;
  state?: string;
  city?: string;
  street?: string;
} & IBaseModel;
