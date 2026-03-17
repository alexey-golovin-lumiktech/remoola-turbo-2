import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ForgotPasswordBody {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;
}
