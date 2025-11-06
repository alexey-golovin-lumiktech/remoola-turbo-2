import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';

import { AdminType } from '@remoola/database';

import { IAdminCreate, IAdminModel, IAdminResponse, IAdminUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class Admin extends BaseModel implements IAdminModel {
  @Expose()
  @IsString()
  @ApiProperty()
  email: string;

  @Expose()
  @IsIn(Object.values(AdminType))
  @ApiProperty({ enum: Object.values(AdminType) })
  type: AdminType;

  @Expose()
  @IsString()
  @ApiProperty()
  password: string;

  @Exclude()
  @IsString()
  salt: string;
}

export class AdminResponse extends OmitType(Admin, [`deletedAt`] as const) implements IAdminResponse {}

export class AdminListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [AdminResponse] })
  @Type(() => AdminResponse)
  data: AdminResponse[];
}

export class AdminCreate
  extends PickType(Admin, [`email`, `password`, `type`] as const)
  implements Omit<IAdminCreate, `salt`> {}

export class AdminUpdate extends PartialType(AdminCreate) implements IAdminUpdate {}
