import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { TRANSACTION_STATUSES, type TAdminPaymentRequestsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminPaymentRequestsListQuery extends AdminListPagination implements TAdminPaymentRequestsListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES })
  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  status?: TAdminPaymentRequestsListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
