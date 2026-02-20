import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class UpdatePreferredCurrencyDto {
  @Expose()
  @ApiProperty({
    enum: [
      $Enums.CurrencyCode.USD,
      $Enums.CurrencyCode.EUR,
      $Enums.CurrencyCode.GBP,
      $Enums.CurrencyCode.JPY,
      $Enums.CurrencyCode.AUD,
    ],
    description: `Preferred display currency (UI default only)`,
    example: $Enums.CurrencyCode.USD,
  })
  @IsEnum($Enums.CurrencyCode)
  preferredCurrency!: $Enums.CurrencyCode;
}
