import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, Matches } from 'class-validator'
import { regexp, constants } from '../../constants'

export interface ILoginBody {
  email: string
  password: string
}

export class LoginBody implements ILoginBody {
  @ApiProperty({ example: `wirebill@admin.com` })
  @IsEmail({}, { message: constants.INCORRECT_EMAIL })
  email: string

  @ApiProperty({ example: `Wirebill123!` })
  @Matches(regexp.password, { message: constants.INCORRECT_PASSWORD })
  password: string
}
