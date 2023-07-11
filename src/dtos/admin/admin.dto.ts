import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsIn, IsString } from 'class-validator'

import { IAdminResponse, IUpdateAdmin } from '@wirebill/shared-common/dtos'
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
  @IsIn(Object.values(AdminType))
  @ApiProperty({ enum: Object.values(AdminType) })
  type: AdminTypeValue

  @Expose()
  @IsString()
  @ApiProperty()
  password: string

  @Exclude()
  @IsString()
  salt: string
}

export class UpdateAdmin implements IUpdateAdmin {
  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  type?: AdminTypeValue

  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  email?: string

  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  password?: string

  @Expose()
  @IsString()
  @ApiProperty({ required: false })
  salt?: string
}

export class AdminResponse extends OmitType(Admin, [`deletedAt`] as const) implements IAdminResponse {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
  id: string
  createdAt: Date
  updatedAt: Date
}

export class CreateAdmin extends PickType(Admin, [`email`, `password`, `type`] as const) {}
