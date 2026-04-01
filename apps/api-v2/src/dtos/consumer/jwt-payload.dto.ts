import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

import { type ConsumerModel } from '@remoola/database-2';

import { IsValidEmail } from '../../shared-common';

export type IJwtTokenPayload = {
  sub?: ConsumerModel[`id`];
  identityId?: ConsumerModel[`id`];
  sid?: string;
  typ?: `access` | `refresh`;
  /** Defense-in-depth scope claim — present on newly-issued tokens. Missing on legacy tokens (tolerated). */
  scope?: `consumer` | `admin`;
  role?: `USER`;
  permissions?: string[];
  email?: ConsumerModel[`email`];
  iat?: number;
  exp?: number;
};

export class JwtTokenPayloadDTO implements IJwtTokenPayload {
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
