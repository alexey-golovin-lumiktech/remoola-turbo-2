import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';

import { type BasicAuthCredentials, constants } from '../../shared-common';

export class Credentials implements BasicAuthCredentials {
  @Expose()
  @IsEmail({}, { message: `INVALID_EMAIL` })
  @ApiProperty({ example: `regular.admin@wirebill.com` })
  email: string;

  @Expose()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  @ApiProperty({ example: `RegularWirebill@Admin123!` })
  password: string;
}
