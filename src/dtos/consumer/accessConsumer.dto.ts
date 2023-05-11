import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'

import { IConsumerModel } from '../../models'
import { IAccessRefresh } from '../common'

export type ISigninResponseConsumer = Pick<
  IConsumerModel,
  | `id` //
  | `email`
  | `googleProfileId`
  | `firstName`
  | `lastName`
  | `middleName`
>
export type ISigninResponse = ISigninResponseConsumer & IAccessRefresh

export class SigninResponseConsumer implements ISigninResponseConsumer {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty({ default: null })
  googleProfileId: string | null

  @Expose()
  @ApiProperty({ default: null })
  firstName: string | null

  @Expose()
  @ApiProperty({ default: null })
  lastName: string | null

  @Expose()
  @ApiProperty({ default: null })
  middleName: string | null
}

export class SigninResponse extends SigninResponseConsumer implements ISigninResponse {
  @Expose()
  @ApiProperty({ example: `access-token-string`, default: null })
  @IsString()
  @IsNotEmpty()
  accessToken: string | null

  @Expose()
  @ApiProperty({ example: `access-token-string`, default: null })
  @IsString()
  @IsNotEmpty()
  refreshToken: string | null
}
