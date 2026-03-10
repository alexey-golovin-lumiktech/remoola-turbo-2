import { Expose } from 'class-transformer';
import { IsEmail, IsNumber, IsString } from 'class-validator';

import { type ConsumerModel } from '@remoola/database-2';

export type IJwtTokenPayload = {
  sub?: ConsumerModel[`id`];
  identityId?: ConsumerModel[`id`];
  sid?: string;
  typ?: `access` | `refresh`;
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
  @IsEmail()
  email: string;

  @Expose()
  @IsNumber()
  iat?: number;

  @Expose()
  @IsNumber()
  exp?: number;
}
