import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { IsValidEmail } from '../../shared-common';

export class ForgotPasswordBody {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsValidEmail()
  email: string;
}
