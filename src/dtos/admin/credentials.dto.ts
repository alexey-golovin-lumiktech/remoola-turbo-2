import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, IsString, Matches } from 'class-validator'

import { constants, regexp } from '../../constants'
import { IConsumerModel } from '../../models'

export type ICredentials = Pick<IConsumerModel, `email` | `password`>

export class Credentials implements ICredentials {
  @Expose()
  @ApiProperty({ example: `wirebill@admin.com` })
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
  @ApiPropertyOptional()
  @IsString()
  firstName?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  lastName?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  middleName?: string
}
