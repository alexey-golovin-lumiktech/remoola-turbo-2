import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class ExchangeRateListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  page?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pageSize?: string;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  @IsOptional()
  from?: $Enums.CurrencyCode;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  @IsOptional()
  to?: $Enums.CurrencyCode;

  @Expose()
  @ApiPropertyOptional({ enum: $Enums.ExchangeRateStatus })
  @IsEnum($Enums.ExchangeRateStatus)
  @IsOptional()
  status?: $Enums.ExchangeRateStatus;

  @Expose()
  @ApiPropertyOptional({ description: `Include expired/effective history`, enum: [`true`, `false`] })
  @IsIn([`true`, `false`])
  @IsOptional()
  includeHistory?: string;

  @Expose()
  @ApiPropertyOptional({ description: `Include expired rows`, enum: [`true`, `false`] })
  @IsIn([`true`, `false`])
  @IsOptional()
  includeExpired?: string;
}
