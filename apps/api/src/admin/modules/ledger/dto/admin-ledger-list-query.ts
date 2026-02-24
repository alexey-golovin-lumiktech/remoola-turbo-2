import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { LEDGER_ENTRY_TYPE_VALUES, TRANSACTION_STATUSES, type TAdminLedgerListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminLedgerListQuery extends AdminListPagination implements TAdminLedgerListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: LEDGER_ENTRY_TYPE_VALUES })
  @IsOptional()
  @IsIn(LEDGER_ENTRY_TYPE_VALUES)
  type?: TAdminLedgerListQuery[`type`];

  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES })
  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  status?: TAdminLedgerListQuery[`status`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
