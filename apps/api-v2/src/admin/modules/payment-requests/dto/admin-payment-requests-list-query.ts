import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { TRANSACTION_STATUSES, type TAdminPaymentRequestsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminPaymentRequestsListQuery extends AdminListPagination implements TAdminPaymentRequestsListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES })
  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  status?: TAdminPaymentRequestsListQuery[`status`];

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
