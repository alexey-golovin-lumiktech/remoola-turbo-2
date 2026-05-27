import { Expose, Transform } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { optionalDateQuery, optionalNumberQuery, optionalStringQuery } from '../../common/query';

export class LedgerEntriesQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  amountSign?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateTo?: Date;
}

export class LedgerDisputesQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateTo?: Date;
}
