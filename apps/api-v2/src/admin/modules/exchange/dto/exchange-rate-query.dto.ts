import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

import { BOOLEAN_QUERY_VALUES, type TBooleanQueryValue } from '@remoola/api-types';
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
  @ApiPropertyOptional({ description: `Include expired/effective history`, enum: BOOLEAN_QUERY_VALUES })
  @IsIn(BOOLEAN_QUERY_VALUES)
  @IsOptional()
  includeHistory?: TBooleanQueryValue;

  @Expose()
  @ApiPropertyOptional({ description: `Include expired rows`, enum: BOOLEAN_QUERY_VALUES })
  @IsIn(BOOLEAN_QUERY_VALUES)
  @IsOptional()
  includeExpired?: TBooleanQueryValue;

  @Expose()
  @ApiPropertyOptional({ description: `Include soft-deleted rates`, enum: BOOLEAN_QUERY_VALUES })
  @IsIn(BOOLEAN_QUERY_VALUES)
  @IsOptional()
  includeDeleted?: TBooleanQueryValue;
}
