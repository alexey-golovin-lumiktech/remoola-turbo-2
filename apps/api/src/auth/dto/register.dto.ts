import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class RegisterBody {
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: $Enums.AdminType, required: false })
  @IsOptional()
  @IsEnum($Enums.AdminType)
  type?: $Enums.AdminType = $Enums.AdminType.ADMIN;
}
