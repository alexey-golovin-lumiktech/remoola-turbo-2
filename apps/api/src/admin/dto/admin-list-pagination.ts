import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { type TAdminListPagination } from '@remoola/api-types';

export class AdminListPagination implements TAdminListPagination {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageSize?: string;
}
