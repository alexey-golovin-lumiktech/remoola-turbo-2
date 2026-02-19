import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ScheduledFxConversionStatuses, type TAdminExchangeScheduledListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminExchangeScheduledListQuery extends AdminListPagination implements TAdminExchangeScheduledListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(ScheduledFxConversionStatuses) })
  @IsOptional()
  @IsIn(Object.values(ScheduledFxConversionStatuses))
  status?: TAdminExchangeScheduledListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
