import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum PaymentReversalKind {
  Refund = `REFUND`,
  Chargeback = `CHARGEBACK`,
}

export class PaymentReversalCreate {
  @Expose()
  @ApiProperty({ enum: PaymentReversalKind })
  @IsEnum(PaymentReversalKind)
  kind: PaymentReversalKind;

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
}
