import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class ExchangeRatePair {
  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  from!: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  to!: $Enums.CurrencyCode;
}

export class ExchangeRateBatchBody {
  @Expose()
  @ApiProperty({ type: [ExchangeRatePair] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeRatePair)
  pairs!: ExchangeRatePair[];
}
