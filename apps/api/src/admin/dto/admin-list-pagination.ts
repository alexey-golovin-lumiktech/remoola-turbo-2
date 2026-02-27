import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { type TAdminListPagination } from '@remoola/api-types';

export class AdminListPagination implements TAdminListPagination {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageSize?: string;
}
