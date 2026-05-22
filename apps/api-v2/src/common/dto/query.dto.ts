import { Expose, Transform } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { OptionalDateQuery, optionalNumberQuery, OptionalNumberQuery, OptionalStringQuery } from '../query-transforms';

export class PagingQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

export class CursorLimitQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  cursor?: string;

  @Expose()
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class SearchWithPagingQuery extends PagingQuery {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  q?: string;
}

export class DateRangePaginationWithPagingQuery extends PagingQuery {
  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Expose()
  @OptionalDateQuery()
  @IsOptional()
  @IsDate()
  dateTo?: Date;
}
