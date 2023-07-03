import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsIn, IsString } from 'class-validator'

import { AdminType } from '@wirebill/shared-common/enums'
import { IAdminModel } from '@wirebill/shared-common/models'
import { AdminTypeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

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

export class AdminResponse extends OmitType(Admin, [`deletedAt`] as const) {}

export class CreateAdminRequest extends PickType(Admin, [`email`, `password`, `type`] as const) {}

export class UpdateAdminRequest extends CreateAdminRequest {}
