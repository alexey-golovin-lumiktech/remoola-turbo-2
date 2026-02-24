import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { PAYMENT_DIRECTIONS, type TPaymentDirection } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

export class PaymentsHistoryQuery {
  @Expose()
  @ApiPropertyOptional({
    enum: PAYMENT_DIRECTIONS,
    description: `Filter by money direction: INCOME = received, OUTCOME = sent`,
  })
  @IsIn(PAYMENT_DIRECTIONS)
  @IsOptional()
  direction?: TPaymentDirection;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.TransactionStatus })
  @IsEnum($Enums.TransactionStatus)
  @IsOptional()
  status?: $Enums.TransactionStatus;

  @Expose()
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
