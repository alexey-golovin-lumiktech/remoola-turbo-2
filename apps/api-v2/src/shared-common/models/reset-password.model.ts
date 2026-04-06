import { type ConsumerAppScope } from '@remoola/api-types';

import { type IBaseModel } from './base.model';

export type IResetPasswordModel = {
  consumerId: string;
  appScope: ConsumerAppScope;
  tokenHash: string;
  expiredAt: Date;
} & IBaseModel;
