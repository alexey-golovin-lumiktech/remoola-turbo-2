import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class Access {
  @Expose()
  @ApiProperty({ example: `admin-id-string` })
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @ApiProperty({ example: `access-token-string` })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @Expose()
  @ApiProperty({ example: `refresh-token-string` })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.AdminType) })
  @IsIn(Object.values($Enums.AdminType))
  type: $Enums.AdminType;

  @Expose()
  @ApiProperty({ example: `email-string` })
  @IsEmail()
  email: string;
}
