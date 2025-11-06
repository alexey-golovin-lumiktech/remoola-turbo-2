import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

import { AdminType } from '@remoola/database';

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
  @ApiProperty({ enum: Object.values(AdminType) })
  @IsIn(Object.values(AdminType))
  type: AdminType;

  @Expose()
  @ApiProperty({ example: `email-string` })
  @IsEmail()
  email: string;
}
