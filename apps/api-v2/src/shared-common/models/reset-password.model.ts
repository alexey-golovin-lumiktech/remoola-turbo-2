import { type IBaseModel } from './base.model';

export type IResetPasswordModel = {
  consumerId: string;
  tokenHash: string;
  expiredAt: Date;
} & IBaseModel;
