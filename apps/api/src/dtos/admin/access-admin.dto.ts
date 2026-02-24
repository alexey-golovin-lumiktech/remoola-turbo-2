import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class Access {
  @Expose()
  @ApiProperty({ description: `Admin user unique identifier (UUID v4)`, example: `admin-id-string` })
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @ApiProperty({ description: `JWT access token for authenticated API requests`, example: `access-token-string` })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @Expose()
  @ApiProperty({ description: `JWT refresh token for obtaining new access tokens`, example: `refresh-token-string` })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @Expose()
  @ApiProperty({ description: `Admin type (SUPER_ADMIN, ADMIN, SUPPORT)`, enum: Object.values($Enums.AdminType) })
  @IsIn(Object.values($Enums.AdminType))
  type: $Enums.AdminType;

  @Expose()
  @ApiProperty({ description: `Admin email address`, example: `email-string` })
  @IsEmail()
  email: string;
}
