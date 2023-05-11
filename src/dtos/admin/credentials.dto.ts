import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, IsString, Matches, ValidateIf } from 'class-validator'

import { constants, regexp } from '../../constants'
import { IConsumerModel } from '../../models'

export type ICredentials = Pick<IConsumerModel, `email` | `password`>

export class Credentials implements ICredentials {
  @Expose()
  @ApiProperty({ example: `super.admin@wirebill.com` })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ example: `Wirebill@Admin123!` })
  @Matches(regexp.password, { message: constants.INVALID_PASSWORD })
  password: string
}

type ConsumerModelSignupPick = Pick<IConsumerModel, `firstName` | `lastName` | `middleName`>
export type ISignup = ICredentials & ConsumerModelSignupPick

export class Signup extends Credentials implements ISignup {
  @Expose()
  @ApiProperty({ default: null })
  @IsString()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  firstName: string = null

  @Expose()
  @ApiProperty({ default: null })
  @IsString()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  lastName: string = null

  @Expose()
  @ApiProperty({ default: null })
  @IsString()
  @ValidateIf(({ value }) => (value == `` ? null : value))
  middleName: string = null
}
