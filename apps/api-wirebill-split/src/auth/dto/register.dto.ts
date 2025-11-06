import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { AdminType } from '@remoola/database';

export class RegisterBody {
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: AdminType, required: false })
  @IsOptional()
  @IsEnum(AdminType)
  type?: AdminType = AdminType.ADMIN;
}
