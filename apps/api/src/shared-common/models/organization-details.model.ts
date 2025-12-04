import { type $Enums } from '@remoola/database-2';

import type { IBaseModel } from './base.model';

export type IOrganizationDetailsModel = {
  name: string;
  size: $Enums.OrganizationSize;
  consumerRole: null | $Enums.ConsumerRole;
  consumerRoleOther: null | string;
} & IBaseModel;
