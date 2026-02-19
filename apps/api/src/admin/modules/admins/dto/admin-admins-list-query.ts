import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { AdminTypes, type TAdminAdminsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminAdminsListQuery extends AdminListPagination implements TAdminAdminsListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(AdminTypes) })
  @IsOptional()
  @IsIn(Object.values(AdminTypes))
  type?: TAdminAdminsListQuery[`type`];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
