import { type IConsumerRole } from './consumer-role.types';
import { type IOrganizationSize } from './organization-size.types';

export type IOrganizationDetails = {
  name: string;
  size: null | IOrganizationSize;
  consumerRole: null | IConsumerRole;
  consumerRoleOther: null | string;
};
