import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { CURRENCY_CODES, TCurrencyCode } from '@remoola/api-types';

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
  @ApiProperty()
  @IsString()
  recipient!: string; // email

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  note?: string | null;
}
