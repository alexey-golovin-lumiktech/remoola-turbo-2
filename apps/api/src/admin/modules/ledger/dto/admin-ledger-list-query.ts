import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { LEDGER_ENTRY_TYPE_VALUES, TRANSACTION_STATUSES, type TAdminLedgerListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminLedgerListQuery extends AdminListPagination implements TAdminLedgerListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: LEDGER_ENTRY_TYPE_VALUES })
  @IsOptional()
  @IsIn(LEDGER_ENTRY_TYPE_VALUES)
  type?: TAdminLedgerListQuery[`type`];

  @Expose()
  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES })
  @IsOptional()
  @IsIn(TRANSACTION_STATUSES)
  status?: TAdminLedgerListQuery[`status`];

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
