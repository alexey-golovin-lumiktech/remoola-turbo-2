import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class RegisterBody {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty({ example: `password` })
  @IsString()
  @MinLength(6)
  password: string;

  @Expose()
  @ApiProperty({ enum: $Enums.AdminType, required: false })
  @IsOptional()
  @IsEnum($Enums.AdminType)
  type?: $Enums.AdminType = $Enums.AdminType.ADMIN;
}
