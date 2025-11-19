import { type IConsumerRole } from './consumer-role.types';
import { type IOrganizationSize } from './organization-size.types';

export type IOrganizationDetails = {
  name: string;
  size: IOrganizationSize | null;
  consumerRole: IConsumerRole | null;
  consumerRoleOther: string | null;
};
