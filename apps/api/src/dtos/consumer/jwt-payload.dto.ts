import { Expose } from 'class-transformer';
import { IsEmail, IsNumber, IsString } from 'class-validator';

import { type ConsumerModel } from '@remoola/database-2';

export type IJwtTokenPayload = {
  identityId: ConsumerModel[`id`];
  email: ConsumerModel[`email`];
  iat?: number;
  exp?: number;
};

export class JwtTokenPayloadDTO implements IJwtTokenPayload {
  @Expose()
  @IsString()
  identityId: string;

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
