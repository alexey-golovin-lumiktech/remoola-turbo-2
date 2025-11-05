import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export interface AdminRefreshTokenPayload {
  sub: string;
  phone: string;
  exp: number;
  iat: number;
}

export type IAdminAuthResponse = {
  accessToken: string;
};

export type IAdminLogin = {
  email: string;
  password: string;
};

export class AdminLogin implements IAdminLogin {
  @Expose()
  @ApiProperty({ example: `admin@example.com` })
  @IsEmail()
  email!: string;

  @Expose()
  @ApiProperty({ example: `wirebill` })
  @IsString()
  @MinLength(4)
  password!: string;
}

export class AdminAuthResponse implements IAdminAuthResponse {
  @Expose()
  @ApiProperty()
  accessToken!: string;
}
