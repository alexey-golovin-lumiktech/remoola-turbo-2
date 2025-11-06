import type { IBaseModel } from './base.model';

export type IResetPasswordModel = {
  consumerId: string;
  token: string;
  expiredAt: Date;
} & IBaseModel;
