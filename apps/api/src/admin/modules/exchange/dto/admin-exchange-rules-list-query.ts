import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { type TAdminExchangeRulesListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

const ENABLED_VALUES = [`true`, `false`] as const;

export class AdminExchangeRulesListQuery extends AdminListPagination implements TAdminExchangeRulesListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ENABLED_VALUES })
  @IsOptional()
  @IsIn(ENABLED_VALUES)
  enabled?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
