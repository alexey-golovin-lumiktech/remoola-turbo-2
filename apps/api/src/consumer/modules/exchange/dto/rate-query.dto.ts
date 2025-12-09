import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class ExchangeRateQuery {
  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  from!: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ enum: $Enums.CurrencyCode })
  @IsEnum($Enums.CurrencyCode)
  to!: $Enums.CurrencyCode;
}
