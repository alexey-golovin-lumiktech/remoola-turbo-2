import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { PagingQuery } from '../../../../common';

export class ConsumerPaymentsListWithPagingQuery extends PagingQuery {
  @Expose()
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @IsString()
  @IsOptional()
  role?: string;

  @Expose()
  @IsString()
  @IsOptional()
  search?: string;
}
