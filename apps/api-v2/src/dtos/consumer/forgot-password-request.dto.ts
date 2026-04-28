import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { type ConsumerForgotPasswordBody as ConsumerForgotPasswordBodyContract } from '@remoola/api-types';

import { IsValidEmail } from '../../shared-common';

export class ForgotPasswordBody implements ConsumerForgotPasswordBodyContract {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsValidEmail()
  email: string;
}
