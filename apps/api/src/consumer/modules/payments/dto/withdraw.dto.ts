import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';

import { CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

export class WithdrawBody {
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
  @ApiProperty({ enum: $Enums.PaymentMethodType })
  @IsEnum($Enums.PaymentMethodType)
  method!: $Enums.PaymentMethodType;
}
