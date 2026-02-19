import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { type TAdminExpectationDateArchiveQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExpectationDateArchiveQuery extends AdminListPagination implements TAdminExpectationDateArchiveQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
