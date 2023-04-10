import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsString, Matches } from 'class-validator'
import { regexp, constants } from '../../constants'
import { Expose } from 'class-transformer'
import { IUserModel } from 'src/models'

export type ICredentials = Pick<IUserModel, `email` | `password`>

export class Credentials implements ICredentials {
  @Expose()
  @ApiProperty({ example: `wirebill@admin.com` })
  @IsEmail({}, { message: constants.INCORRECT_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ example: `Wirebill@Admin123!` })
  @Matches(regexp.password, { message: constants.INCORRECT_PASSWORD })
  password: string
}

type IUserModelSignupPick = Pick<IUserModel, `firstName` | `lastName` | `middleName`>
export type ISignup = ICredentials & IUserModelSignupPick

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
