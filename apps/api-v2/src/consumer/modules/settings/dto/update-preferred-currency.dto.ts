import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn } from 'class-validator';

import { CURRENCY_CODE, CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

export class UpdatePreferredCurrency {
  @Expose()
  @ApiProperty({
    enum: CURRENCY_CODES,
    description: `Preferred display currency (UI default only)`,
    example: CURRENCY_CODE.USD,
  })
  @IsIn(CURRENCY_CODES)
  preferredCurrency!: TCurrencyCode;
}
