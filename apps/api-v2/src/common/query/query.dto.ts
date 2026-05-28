import { Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { optionalNumberQuery, OptionalNumberQuery, OptionalStringQuery } from './query-transforms';

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
