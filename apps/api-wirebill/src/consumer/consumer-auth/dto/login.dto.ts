import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export interface IConsumerRefreshTokenPayload {
  sub: string;
  phone: string;
  exp: number;
  iat: number;
}

export type IConsumerAuthResponse = {
  accessToken: string;
};

export type IConsumerLogin = {
  email: string;
  password: string;
};

export class ConsumerLogin implements IConsumerLogin {
  @Expose()
  @ApiProperty({ example: `consumer@example.com` })
  @IsEmail()
  email!: string;

  @Expose()
  @ApiProperty({ example: `consumer` })
  @IsString()
  @MinLength(4)
  password!: string;
}

export class ConsumerAuthResponse implements IConsumerAuthResponse {
  @Expose()
  @ApiProperty()
  accessToken!: string;
}
