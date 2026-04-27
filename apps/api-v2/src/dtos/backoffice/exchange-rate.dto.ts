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
  @ApiProperty({ description: `Source currency code (ISO 4217)`, enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  fromCurrency: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ description: `Target currency code (ISO 4217)`, enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  toCurrency: $Enums.CurrencyCode;

  @Expose()
  @IsNumber()
  rate: number;

  @Expose()
  @ApiPropertyOptional({ description: `Bid price for the currency pair (buy price)` })
  @IsOptional()
  @IsNumber()
  rateBid?: number | null;

  @Expose()
  @ApiPropertyOptional({ description: `Ask price for the currency pair (sell price)` })
  @IsOptional()
  @IsNumber()
  rateAsk?: number | null;

  @Expose()
  @ApiPropertyOptional({ description: `Spread in basis points (1 bp = 0.01%)` })
  @IsOptional()
  @IsInt()
  @Min(0)
  spreadBps?: number | null;

  @Expose()
  @ApiPropertyOptional({
    description: `Exchange rate status (PENDING, ACTIVE, EXPIRED, REJECTED)`,
    enum: Object.values($Enums.ExchangeRateStatus),
  })
  @IsOptional()
  @IsEnum($Enums.ExchangeRateStatus)
  status?: $Enums.ExchangeRateStatus;

  @Expose()
  @ApiPropertyOptional({ description: `Date when the exchange rate becomes effective (ISO 8601)` })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @Expose()
  @ApiPropertyOptional({ description: `Date when the exchange rate expires (ISO 8601)` })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Timestamp when the rate was fetched from the provider (ISO 8601)` })
  @IsOptional()
  @IsDateString()
  fetchedAt?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Name of the rate provider (e.g., "exchangerate-api.com", "fixer.io")` })
  @IsOptional()
  @IsString()
  provider?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Provider-specific rate ID for reference and auditing` })
  @IsOptional()
  @IsString()
  providerRateId?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Confidence score (0-100) indicating data reliability` })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number | null;

  @Expose()
  @ApiPropertyOptional({ description: `ID of the admin who created this exchange rate record` })
  @IsOptional()
  @IsString()
  createdBy?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `ID of the admin who last updated this exchange rate record` })
  @IsOptional()
  @IsString()
  updatedBy?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `ID of the admin who approved this exchange rate` })
  @IsOptional()
  @IsString()
  approvedBy?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Timestamp when the exchange rate was approved (ISO 8601)` })
  @IsOptional()
  @IsDateString()
  approvedAt?: string | null;
}

export class ExchangeRateResponse
  extends OmitType(ExchangeRate, [`deletedAt`] as const)
  implements IExchangeRateResponse {}

export class ExchangeRatesListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of exchange rates in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of exchange rate records`, required: true, type: [ExchangeRateResponse] })
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
