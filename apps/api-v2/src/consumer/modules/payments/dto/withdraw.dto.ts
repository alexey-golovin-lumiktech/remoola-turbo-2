import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { CURRENCY_CODES, type ConsumerWithdrawPayload, type TCurrencyCode } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

export class WithdrawBody implements ConsumerWithdrawPayload {
  @Expose()
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @Expose()
  @ApiPropertyOptional({ enum: CURRENCY_CODES, description: `Currency for the withdrawal (default USD)` })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currencyCode?: TCurrencyCode;

  @Expose()
  @ApiPropertyOptional({ enum: CURRENCY_CODES, description: `Compatibility alias for legacy mobile clients` })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: TCurrencyCode;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.PaymentMethodType })
  @IsOptional()
  @IsEnum($Enums.PaymentMethodType)
  method?: $Enums.PaymentMethodType;

  @Expose()
  @ApiPropertyOptional({ description: `Compatibility alias for legacy mobile clients` })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
