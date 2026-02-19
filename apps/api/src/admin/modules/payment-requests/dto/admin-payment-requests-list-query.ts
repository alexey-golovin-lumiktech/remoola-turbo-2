import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { TransactionStatus, type TAdminPaymentRequestsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminPaymentRequestsListQuery extends AdminListPagination implements TAdminPaymentRequestsListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(TransactionStatus) })
  @IsOptional()
  @IsIn(Object.values(TransactionStatus))
  status?: TAdminPaymentRequestsListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
