import { type IBaseModel } from './base.model';

export type IBillingDetailsModel = {
  email?: string;
  name?: string;
  phone?: string;
} & IBaseModel;
