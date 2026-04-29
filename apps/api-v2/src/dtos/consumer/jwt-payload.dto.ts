import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { IsValidEmail } from '../../shared-common';

export type IJwtTokenPayload = {
  sub?: ConsumerModel[`id`];
  identityId?: ConsumerModel[`id`];
  sid?: string;
  typ?: `access` | `refresh`;
  /** Access tokens must carry the audience scope (`consumer` or `admin`). */
  scope?: `consumer` | `admin`;
  appScope?: ConsumerAppScope;
  role?: `USER`;
  permissions?: string[];
  email?: ConsumerModel[`email`];
  iat?: number;
  exp?: number;
};

export class JwtTokenPayload implements IJwtTokenPayload {
  @Expose()
  @IsString()
  identityId?: string;

  @Expose()
  @IsString()
  sid?: string;

  @Expose()
  @IsValidEmail()
  email: string;

  @Expose()
  @IsNumber()
  iat?: number;

  @Expose()
  @IsNumber()
  exp?: number;
}
