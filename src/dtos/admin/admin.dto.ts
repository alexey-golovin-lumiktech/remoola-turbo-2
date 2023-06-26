import { ApiProperty, PickType } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'
import { IsIn, IsString } from 'class-validator'

import { IAdminModel } from '../../models'
import { AdminType, AdminTypeValue } from '../../shared-types'
import { BaseModel, ListResponse } from '../common'

class Admin extends BaseModel implements IAdminModel {
  @Expose()
  @IsString()
  @ApiProperty()
  email: string

  @Expose()
  @IsIn(Object.keys(AdminType))
  @ApiProperty({ enum: Object.keys(AdminType) })
  type: AdminTypeValue

  @Expose()
  @IsString()
  @ApiProperty()
  password: string

  @Exclude()
  @IsString()
  salt: string
}

export class AdminResponse extends Admin {}

export class CreateAdminRequest extends PickType(Admin, [`email`, `password`, `type`] as const) {}

export class UpdateAdminRequest extends CreateAdminRequest {}

export class AdminsList extends ListResponse<Admin> {
  @Expose()
  @ApiProperty({ type: [Admin] })
  @Type(() => Admin)
  data: Admin[]
}
