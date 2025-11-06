import { type OrganizationSize } from '@remoola/database';

import type { ConsumerRoleValue } from '../types';
import type { IBaseModel } from './base.model';

export type IOrganizationDetailsModel = {
  name: string;
  size: OrganizationSize;
  consumerRole: string | ConsumerRoleValue;
} & IBaseModel;
