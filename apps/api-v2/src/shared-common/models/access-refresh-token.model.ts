import { type IBaseModel } from './base.model';

export type IAccessRefreshTokenModel = {
  identityId: string;
  accessToken: string;
  refreshToken: string;
} & IBaseModel;
