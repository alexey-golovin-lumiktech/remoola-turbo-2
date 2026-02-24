import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ADMIN_TYPES, type TAdminAdminsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminAdminsListQuery extends AdminListPagination implements TAdminAdminsListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ADMIN_TYPES })
  @IsOptional()
  @IsIn(ADMIN_TYPES)
  type?: TAdminAdminsListQuery[`type`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
