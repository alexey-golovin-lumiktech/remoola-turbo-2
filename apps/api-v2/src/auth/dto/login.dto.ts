import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

import { IsValidEmail } from '../../shared-common';

export class LoginBody {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsValidEmail()
  email: string;

  @Expose()
  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;
}
