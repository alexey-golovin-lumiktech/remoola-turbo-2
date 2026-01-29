import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginBody {
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;
}
