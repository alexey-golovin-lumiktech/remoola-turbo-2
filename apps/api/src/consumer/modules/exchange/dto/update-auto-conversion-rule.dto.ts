import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class UpdateAutoConversionRuleBody {
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
  @ApiPropertyOptional({ description: `Keep at least this amount in source currency` })
  @IsNumber()
  @Min(0)
  @IsOptional()
  targetBalance?: number;

  @Expose()
  @ApiPropertyOptional({ description: `Optional cap for a single auto conversion` })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  maxConvertAmount?: number | null;

  @Expose()
  @ApiPropertyOptional({ description: `Minimum minutes between rule executions` })
  @IsInt()
  @Min(1)
  @IsOptional()
  minIntervalMinutes?: number;

  @Expose()
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
