import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import { type IAdminCreate, type IAdminModel, type IAdminResponse, type IAdminUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class Admin extends BaseModel implements IAdminModel {
  @Expose()
  @IsString()
  @ApiProperty({ description: `Admin email address (used for authentication)` })
  email: string;

  @Expose()
  @IsIn(Object.values($Enums.AdminType))
  @ApiProperty({ description: `Admin type (SUPER_ADMIN, ADMIN, SUPPORT)`, enum: Object.values($Enums.AdminType) })
  type: $Enums.AdminType;

  @Expose()
  @IsString()
  @ApiProperty({ description: `Bcrypt-hashed password (write-only, never returned in responses)` })
  password: string;

  @Exclude()
  @IsString()
  salt: string;
}

export class AdminResponse extends OmitType(Admin, [`deletedAt`] as const) implements IAdminResponse {}

export class AdminListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of admins in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of admin records`, required: true, type: [AdminResponse] })
  @Type(() => AdminResponse)
  data: AdminResponse[];
}

export class AdminCreate
  extends PickType(Admin, [`email`, `password`, `type`] as const)
  implements Omit<IAdminCreate, `salt`> {}

export class AdminUpdate extends PartialType(AdminCreate) implements IAdminUpdate {}
