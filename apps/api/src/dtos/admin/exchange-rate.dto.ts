import { ApiProperty, ApiPropertyOptional, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IExchangeRateModel,
  type IExchangeRateResponse,
  type IExchangeRateCreate,
  type IExchangeRateUpdate,
} from '../../shared-common';
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

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rateBid?: number | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rateAsk?: number | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  spreadBps?: number | null;

  @Expose()
  @ApiPropertyOptional({ enum: Object.values($Enums.ExchangeRateStatus) })
  @IsOptional()
  @IsEnum($Enums.ExchangeRateStatus)
  status?: $Enums.ExchangeRateStatus;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fetchedAt?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerRateId?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedBy?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string | null;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  approvedAt?: string | null;
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

export class ExchangeRateCreate
  extends PickType(ExchangeRate, [
    `fromCurrency`,
    `toCurrency`,
    `rate`,
    `rateBid`,
    `rateAsk`,
    `spreadBps`,
    `status`,
    `effectiveAt`,
    `expiresAt`,
    `fetchedAt`,
    `provider`,
    `providerRateId`,
    `confidence`,
  ] as const)
  implements IExchangeRateCreate {}

export class ExchangeRateUpdate extends PartialType(ExchangeRateCreate) implements IExchangeRateUpdate {}
