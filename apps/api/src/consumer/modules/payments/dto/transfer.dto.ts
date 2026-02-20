import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { ALL_CURRENCY_CODES } from '@remoola/api-types';

export class TransferBody {
  @Expose()
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @Expose()
  @ApiPropertyOptional({ enum: ALL_CURRENCY_CODES, description: `Currency for the transfer (default USD)` })
  @IsOptional()
  @IsIn(ALL_CURRENCY_CODES)
  currencyCode?: (typeof ALL_CURRENCY_CODES)[number];

  @Expose()
  @ApiProperty()
  @IsString()
  recipient!: string; // email

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  note?: string | null;
}
