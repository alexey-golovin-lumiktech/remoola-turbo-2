import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { ConsumerResponse } from './consumer.dto'

export class SigninResponse extends ConsumerResponse {
  @Expose()
  @ApiProperty({ example: `access-token-string` })
  accessToken: string

  @Expose()
  @ApiProperty({ example: `access-token-string` })
  refreshToken: string
}

export class SignupRequest extends PickType(ConsumerResponse, [`email`, `firstName`, `lastName`, `middleName`, `password`] as const) {}
