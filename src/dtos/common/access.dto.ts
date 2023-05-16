import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, Matches } from 'class-validator'

import * as constants from 'src/constants'

export class Access {
  @Expose()
  @ApiProperty()
  accessToken: string

  @Expose()
  @ApiProperty()
  refreshToken: string
}

export class Credentials {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  email: string

  @Expose()
  @Matches(constants.regexp.password, { message: constants.constants.INVALID_PASSWORD })
  @ApiProperty()
  password: string
}
