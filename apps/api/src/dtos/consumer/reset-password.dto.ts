import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

import { type IChangePasswordBody, type IChangePasswordParam } from '../../shared-common';

export class ChangePasswordBody implements IChangePasswordBody {
  @Expose()
  @ApiProperty({ description: `Email address for password reset (optional if token is provided)` })
  @IsEmail()
  @ValidateIf(({ value }) => value != null)
  email?: string = null;

  @Expose()
  @ApiProperty({ description: `New password (optional if email is provided for reset request)` })
  @IsString()
  @ValidateIf(({ value }) => value != null)
  password?: string = null;
}

export class ChangePasswordParam implements IChangePasswordParam {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: `Password reset token from email link` })
  token: string;
}
