import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { LedgerEntryTypes, TransactionStatus, type TAdminLedgerListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminLedgerListQuery extends AdminListPagination implements TAdminLedgerListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(LedgerEntryTypes) })
  @IsOptional()
  @IsIn(Object.values(LedgerEntryTypes))
  type?: TAdminLedgerListQuery[`type`];

  @ApiPropertyOptional({ enum: Object.values(TransactionStatus) })
  @IsOptional()
  @IsIn(Object.values(TransactionStatus))
  status?: TAdminLedgerListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
