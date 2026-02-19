import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginBody {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;
}
