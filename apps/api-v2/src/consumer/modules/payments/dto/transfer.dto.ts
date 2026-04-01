import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

export class TransferBody {
  @Expose()
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @Expose()
  @ApiPropertyOptional({ enum: CURRENCY_CODES, description: `Currency for the transfer (default USD)` })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currencyCode?: TCurrencyCode;

  @Expose()
  @ApiPropertyOptional({ enum: CURRENCY_CODES, description: `Compatibility alias for legacy mobile clients` })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: TCurrencyCode;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipient?: string; // email or phone

  @Expose()
  @ApiPropertyOptional({ description: `Compatibility alias for legacy mobile clients` })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;
}
