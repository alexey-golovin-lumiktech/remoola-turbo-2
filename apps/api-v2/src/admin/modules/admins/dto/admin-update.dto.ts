import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateBody {
  @Expose()
  @ApiProperty({ enum: [`delete`, `restore`] })
  @IsIn([`delete`, `restore`])
  action!: `delete` | `restore`;

  /** Step-up: required when action is `delete`. Re-enter current admin password. */
  @Expose()
  @ApiProperty({ required: false, description: `Current admin password (required for delete)` })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  passwordConfirmation?: string;
}
