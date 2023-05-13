import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, Matches, ValidateIf } from 'class-validator'

import * as constants from '../../constants'
import { IConsumerModel } from '../../models'

export type ICredentials = Pick<IConsumerModel, `email` | `password`>

export class Credentials implements ICredentials {
  @Expose()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  @ApiProperty({ example: `super.admin@wirebill.com` })
  email: string

  @Expose()
  @Matches(constants.regexp.password, { message: constants.constants.INVALID_PASSWORD })
  @ApiProperty({ example: `Wirebill@Admin123!` })
  password: string
}

type ConsumerModelSignupPick = Pick<IConsumerModel, `firstName` | `lastName` | `middleName`>
export type ISignup = ICredentials & ConsumerModelSignupPick

export class Signup extends Credentials implements ISignup {
  @Expose()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  @ApiPropertyOptional({ type: String })
  firstName?: string

  @Expose()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  @ApiPropertyOptional({ type: String })
  lastName?: string

  @Expose()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  @ApiPropertyOptional({ type: String })
  middleName?: string
}
