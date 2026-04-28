import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { type ConsumerResetPasswordBody } from '@remoola/api-types';

export class ResetPasswordDto implements ConsumerResetPasswordBody {
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
