import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import {
  ACCOUNT_TYPES,
  CONTRACTOR_KINDS,
  VERIFICATION_STATUSES,
  type TAdminConsumersListQuery,
} from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminConsumersListQuery extends AdminListPagination implements TAdminConsumersListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  accountType?: TAdminConsumersListQuery[`accountType`];

  @ApiPropertyOptional({ enum: CONTRACTOR_KINDS })
  @IsOptional()
  @IsIn(CONTRACTOR_KINDS)
  contractorKind?: TAdminConsumersListQuery[`contractorKind`];

  @ApiPropertyOptional({ enum: VERIFICATION_STATUSES })
  @IsOptional()
  @IsIn(VERIFICATION_STATUSES)
  verificationStatus?: TAdminConsumersListQuery[`verificationStatus`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verified?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
