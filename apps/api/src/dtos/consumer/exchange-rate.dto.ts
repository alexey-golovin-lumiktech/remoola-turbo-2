import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import { type IExchangeRateModel, type IExchangeRateResponse } from '../../shared-common';
import { BaseModel } from '../common';

class ExchangeRate extends BaseModel implements IExchangeRateModel {
  @Expose()
  @ApiProperty({ enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  fromCurrency: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  toCurrency: $Enums.CurrencyCode;

  @Expose()
  @IsNumber()
  rate: number;
}

export class ExchangeRateResponse
  extends OmitType(ExchangeRate, [`deletedAt`] as const)
  implements IExchangeRateResponse {}

export class ExchangeRatesListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [ExchangeRateResponse] })
  @Type(() => ExchangeRateResponse)
  data: ExchangeRateResponse[];
}

export class ExchangeConsumerCurrencyBody extends PickType(ExchangeRate, [`fromCurrency`, `toCurrency`] as const) {
  @Expose()
  @IsNumber()
  amount: number;
}
