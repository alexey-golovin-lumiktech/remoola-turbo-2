import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

import {
  type ConsumerForgotPasswordBody as ConsumerForgotPasswordBodyContract,
  type ConsumerResetPasswordBody,
} from '@remoola/api-types';

import { IsValidEmail } from '../../../shared-common';

export class ForgotPasswordBody implements ConsumerForgotPasswordBodyContract {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsValidEmail()
  email: string;
}

export class ResetPassword implements ConsumerResetPasswordBody {
  @Expose()
  @ApiProperty({ description: `Reset token from the forgot-password email link` })
  @IsString()
  @MaxLength(512)
  token: string;

  @Expose()
  @ApiProperty({ example: `newSecurePassword123`, minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
