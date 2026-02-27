import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PAYMENT_REVERSAL_KINDS, type TPaymentReversalKind } from '@remoola/api-types';

export class PaymentReversalCreate {
  @Expose()
  @ApiProperty({
    enum: PAYMENT_REVERSAL_KINDS,
    description: `Type of payment reversal`,
    example: `REFUND`,
  })
  @IsIn(PAYMENT_REVERSAL_KINDS)
  kind: TPaymentReversalKind;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PaymentReversalBody {
  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Step-up: re-enter current admin password to confirm refund/chargeback. */
  @Expose()
  @ApiProperty({ required: true, description: `Current admin password (step-up confirmation)` })
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}
