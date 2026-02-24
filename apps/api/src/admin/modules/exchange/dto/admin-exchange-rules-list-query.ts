import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { BOOLEAN_QUERY_VALUES, type TBooleanQueryValue, type TAdminExchangeRulesListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExchangeRulesListQuery extends AdminListPagination implements TAdminExchangeRulesListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: BOOLEAN_QUERY_VALUES })
  @IsOptional()
  @IsIn(BOOLEAN_QUERY_VALUES)
  enabled?: TBooleanQueryValue;

  @ApiPropertyOptional({ enum: BOOLEAN_QUERY_VALUES })
  @IsOptional()
  @IsIn(BOOLEAN_QUERY_VALUES)
  includeDeleted?: TBooleanQueryValue;
}
