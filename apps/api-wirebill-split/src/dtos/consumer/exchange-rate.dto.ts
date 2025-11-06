import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

import { CurrencyCode } from '@remoola/database';

import { IExchangeRateModel, IExchangeRateResponse } from '../../shared-common';
import { BaseModel } from '../common';

class ExchangeRate extends BaseModel implements IExchangeRateModel {
  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  fromCurrency: CurrencyCode;

  @Expose()
  @ApiProperty({ enum: Object.values(CurrencyCode) })
  @IsString()
  @IsIn(Object.values(CurrencyCode))
  toCurrency: CurrencyCode;

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
