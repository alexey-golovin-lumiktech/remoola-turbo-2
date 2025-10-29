import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { IAuthResponse, ILogin } from '../../../common';

export class Login implements ILogin {
  @Expose()
  @ApiProperty({ example: `remoola@example.com` })
  @IsEmail()
  email!: string;

  @Expose()
  @ApiProperty({ example: `remoola` })
  @IsString()
  @MinLength(4)
  password!: string;
}

export class AuthResponse implements IAuthResponse {
  @Expose()
  @ApiProperty()
  access_token!: string;
}
