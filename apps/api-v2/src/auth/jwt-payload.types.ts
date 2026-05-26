import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

export type IJwtTokenPayload = {
  sub?: ConsumerModel[`id`];
  identityId?: ConsumerModel[`id`];
  sid?: string;
  typ?: `access` | `refresh`;
  scope?: `consumer` | `admin`;
  appScope?: ConsumerAppScope;
  role?: `USER`;
  permissions?: string[];
  email?: ConsumerModel[`email`];
  iat?: number;
  exp?: number;
};
