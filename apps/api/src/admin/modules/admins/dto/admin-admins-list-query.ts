import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ADMIN_TYPES, type TAdminAdminsListQuery } from '@remoola/api-types';

import { AdminListPagination } from '../../../dto';

export class AdminAdminsListQuery extends AdminListPagination implements TAdminAdminsListQuery {
  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @Expose()
  @ApiPropertyOptional({ enum: ADMIN_TYPES })
  @IsOptional()
  @IsIn(ADMIN_TYPES)
  type?: TAdminAdminsListQuery[`type`];

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
