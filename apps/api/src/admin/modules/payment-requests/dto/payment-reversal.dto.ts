import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum PaymentReversalKind {
  Refund = `REFUND`,
  Chargeback = `CHARGEBACK`,
}

export class PaymentReversalCreate {
  @ApiProperty({ enum: PaymentReversalKind })
  @IsEnum(PaymentReversalKind)
  kind: PaymentReversalKind;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PaymentReversalBody {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
