import { Expose } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { OptionalDateQuery, OptionalNumberQuery, OptionalStringQuery } from '../query-transforms';

export class PaginationQueryDto {
  @Expose()
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @Expose()
  @OptionalNumberQuery()
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

export class CursorLimitQueryDto {
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

export class SearchPaginationQueryDto extends PaginationQueryDto {
  @Expose()
  @OptionalStringQuery()
  @IsOptional()
  @IsString()
  q?: string;
}

export class DateRangePaginationQueryDto extends PaginationQueryDto {
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
