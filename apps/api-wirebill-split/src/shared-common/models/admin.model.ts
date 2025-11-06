import { type AdminType } from '@remoola/database';

import type { IBaseModel } from './base.model';

export type IAdminModel = {
  email: string;
  type: AdminType;
  password: string;
  salt: string;
} & IBaseModel;
