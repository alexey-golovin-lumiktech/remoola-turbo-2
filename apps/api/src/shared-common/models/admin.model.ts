import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';

export type IAdminModel = {
  email: string;
  type: $Enums.AdminType;
  password: string;
  salt: string;
} & IBaseModel;
