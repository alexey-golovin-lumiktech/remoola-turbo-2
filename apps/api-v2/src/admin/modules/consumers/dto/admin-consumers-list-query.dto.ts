import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import {
  ACCOUNT_TYPES,
  CONTRACTOR_KINDS,
  VERIFICATION_STATUSES,
  type TAdminConsumersListQuery,
} from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminConsumersListQuery extends AdminListPagination implements TAdminConsumersListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  accountType?: TAdminConsumersListQuery[`accountType`];

  @Expose()
  @ApiPropertyOptional({ enum: CONTRACTOR_KINDS })
  @IsOptional()
  @IsIn(CONTRACTOR_KINDS)
  contractorKind?: TAdminConsumersListQuery[`contractorKind`];

  @Expose()
  @ApiPropertyOptional({ enum: VERIFICATION_STATUSES })
  @IsOptional()
  @IsIn(VERIFICATION_STATUSES)
  verificationStatus?: TAdminConsumersListQuery[`verificationStatus`];

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verified?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
