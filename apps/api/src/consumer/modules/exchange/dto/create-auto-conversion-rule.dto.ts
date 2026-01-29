import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class CreateAutoConversionRuleBody {
  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  from!: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  to!: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ description: `Keep at least this amount in source currency` })
  @IsNumber()
  @Min(0)
  targetBalance!: number;

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
  minIntervalMinutes?: number | null;

  @Expose()
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean | null;
}
