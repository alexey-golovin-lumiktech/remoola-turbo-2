import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IConsumerModel } from '../../models'
import { IAccessRefresh } from '../common'

export type ISigninResponseConsumer = Pick<
  IConsumerModel,
  | `id` //
  | `email`
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
  @ApiPropertyOptional({ default: null })
  firstName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  lastName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  middleName?: string
}

export class SigninResponse extends SigninResponseConsumer implements ISigninResponse {
  @Expose()
  @ApiProperty({ example: `access-token-string` })
  accessToken: string

  @Expose()
  @ApiProperty({ example: `access-token-string` })
  refreshToken: string
}
