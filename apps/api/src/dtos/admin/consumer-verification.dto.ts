import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { type TVerificationAction, VERIFICATION_ACTIONS } from '@remoola/api-types';

export class ConsumerVerificationUpdate {
  @Expose()
  @ApiProperty({ required: true, enum: VERIFICATION_ACTIONS })
  @IsIn(VERIFICATION_ACTIONS)
  action: TVerificationAction;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
