import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordBody {
  @Expose()
  @ApiProperty({ description: `Current password for verification` })
  @IsString()
  currentPassword: string;

  @Expose()
  @ApiProperty({ example: `newSecurePassword123`, minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
