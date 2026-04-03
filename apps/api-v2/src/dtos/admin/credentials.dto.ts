import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Matches } from 'class-validator';

import { type EmailPasswordCredentials, constants, IsValidEmail } from '../../shared-common';

export class Credentials implements EmailPasswordCredentials {
  @Expose()
  @IsValidEmail({ message: constants.INVALID_EMAIL })
  @ApiProperty({ example: `regular.admin@wirebill.com` })
  email: string;

  @Expose()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  @ApiProperty({ example: `RegularWirebill@Admin123!` })
  password: string;
}
