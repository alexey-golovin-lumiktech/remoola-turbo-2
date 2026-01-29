import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const VerificationAction = {
  APPROVE: `approve`,
  REJECT: `reject`,
  MORE_INFO: `more_info`,
  FLAG: `flag`,
} as const;

export type VerificationAction = (typeof VerificationAction)[keyof typeof VerificationAction];

export class ConsumerVerificationUpdateDto {
  @Expose()
  @ApiProperty({ required: true, enum: Object.values(VerificationAction) })
  @IsIn(Object.values(VerificationAction))
  action: VerificationAction;

  @Expose()
  @ApiProperty({ required: false, default: null })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
