import { Expose } from 'class-transformer'
import { IsEmail, IsNumber, IsString } from 'class-validator'

import { IConsumerModel } from '@wirebill/shared-common/models'

export type IJwtTokenPayload = {
  identityId: IConsumerModel[`id`]
  email: IConsumerModel[`email`]
  iat?: number
  exp?: number
}

export class JwtTokenPayload implements IJwtTokenPayload {
  @Expose()
  @IsString()
  identityId: string

  @Expose()
  @IsEmail()
  email: string

  @Expose()
  @IsNumber()
  iat?: number

  @Expose()
  @IsNumber()
  exp?: number
}
