import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { type TVerificationAction, VERIFICATION_ACTIONS } from '@remoola/api-types';

export class ConsumerVerificationUpdate {
  @Expose()
  @ApiProperty({
    description: `Verification action to perform (APPROVE, REJECT, REQUEST_CHANGES)`,
    required: true,
    enum: VERIFICATION_ACTIONS,
  })
  @IsIn(VERIFICATION_ACTIONS)
  action: TVerificationAction;

  @Expose()
  @ApiProperty({ description: `Optional reason for rejection or request for changes`, required: false, default: null })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
