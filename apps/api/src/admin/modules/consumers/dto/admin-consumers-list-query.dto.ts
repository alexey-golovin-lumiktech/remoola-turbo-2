import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { AccountTypes, ContractorKinds, VerificationStatuses, type TAdminConsumersListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminConsumersListQuery extends AdminListPagination implements TAdminConsumersListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(AccountTypes) })
  @IsOptional()
  @IsIn(Object.values(AccountTypes))
  accountType?: TAdminConsumersListQuery[`accountType`];

  @ApiPropertyOptional({ enum: Object.values(ContractorKinds) })
  @IsOptional()
  @IsIn(Object.values(ContractorKinds))
  contractorKind?: TAdminConsumersListQuery[`contractorKind`];

  @ApiPropertyOptional({ enum: Object.values(VerificationStatuses) })
  @IsOptional()
  @IsIn(Object.values(VerificationStatuses))
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
