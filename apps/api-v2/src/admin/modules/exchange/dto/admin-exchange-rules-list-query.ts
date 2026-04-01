import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { BOOLEAN_QUERY_VALUES, type TBooleanQueryValue, type TAdminExchangeRulesListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExchangeRulesListQuery extends AdminListPagination implements TAdminExchangeRulesListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: BOOLEAN_QUERY_VALUES })
  @IsOptional()
  @IsIn(BOOLEAN_QUERY_VALUES)
  enabled?: TBooleanQueryValue;

  @Expose()
  @ApiPropertyOptional({ enum: BOOLEAN_QUERY_VALUES })
  @IsOptional()
  @IsIn(BOOLEAN_QUERY_VALUES)
  includeDeleted?: TBooleanQueryValue;
}
