import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { SCHEDULED_FX_CONVERSION_STATUSES, type TAdminExchangeScheduledListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExchangeScheduledListQuery extends AdminListPagination implements TAdminExchangeScheduledListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: SCHEDULED_FX_CONVERSION_STATUSES })
  @IsOptional()
  @IsIn(SCHEDULED_FX_CONVERSION_STATUSES)
  status?: TAdminExchangeScheduledListQuery[`status`];

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
