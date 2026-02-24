import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { SCHEDULED_FX_CONVERSION_STATUSES, type TAdminExchangeScheduledListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExchangeScheduledListQuery extends AdminListPagination implements TAdminExchangeScheduledListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: SCHEDULED_FX_CONVERSION_STATUSES })
  @IsOptional()
  @IsIn(SCHEDULED_FX_CONVERSION_STATUSES)
  status?: TAdminExchangeScheduledListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
