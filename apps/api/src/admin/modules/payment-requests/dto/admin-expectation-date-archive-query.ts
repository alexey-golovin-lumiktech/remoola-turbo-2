import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

import { type TAdminExpectationDateArchiveQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExpectationDateArchiveQuery extends AdminListPagination implements TAdminExpectationDateArchiveQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
