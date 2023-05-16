import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, Matches } from 'class-validator'

import * as CommonDTOS from '../common'

import * as constants from 'src/constants'

export class Credentials extends CommonDTOS.Credentials {
  @Expose()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  @ApiProperty({ example: `super.admin@wirebill.com` })
  email: string

  @Expose()
  @Matches(constants.regexp.password, { message: constants.constants.INVALID_PASSWORD })
  @ApiProperty({ example: `Wirebill@Admin123!` })
  password: string
}
