import { type TOrganizationSize, type TConsumerRole } from '@remoola/api-types';

export type IOrganizationDetails = {
  name: string;
  size: null | TOrganizationSize;
  consumerRole: null | TConsumerRole;
  consumerRoleOther: null | string;
};
