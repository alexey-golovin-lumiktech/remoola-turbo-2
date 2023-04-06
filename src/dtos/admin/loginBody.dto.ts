import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, Matches } from 'class-validator'
import { regexp, constants } from '../../constants'
import { Expose } from 'class-transformer'

export interface ILoginBody {
  email: string
  password: string
}

export class LoginBody implements ILoginBody {
  @Expose()
  @ApiProperty({ example: `wirebill@admin.com` })
  @IsEmail({}, { message: constants.INCORRECT_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ example: `Wirebill@Admin123!` })
  @Matches(regexp.password, { message: constants.INCORRECT_PASSWORD })
  password: string
}
