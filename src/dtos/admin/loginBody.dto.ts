import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, Matches } from 'class-validator'
import { regexp, constants } from 'src/constants'

export interface ILoginBody {
  email: string
  password: string
}

export class LoginBody implements ILoginBody {
  @ApiProperty({ example: `wirebill@admin.com` })
  @IsEmail({}, { message: constants.INCORRECT_EMAIL })
  email: string

  @ApiProperty({ example: `vUN55@vV8@c@` })
  @Matches(regexp.password, { message: constants.INCORRECT_PASSWORD })
  password: string
}
