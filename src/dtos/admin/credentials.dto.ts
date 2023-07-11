import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, Matches } from 'class-validator'

import { BasicAuthCredentials } from '@wirebill/shared-common/dtos'

import * as constants from '../../constants'

export class Credentials implements BasicAuthCredentials {
  @Expose()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  @ApiProperty({ example: `super.admin@wirebill.com` })
  email: string

  @Expose()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  @ApiProperty({ example: `Wirebill@Admin123!` })
  password: string
}
