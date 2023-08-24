import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IAdminResourceCreate, IAdminResourceResponse, IAdminResourceUpdate } from '@wirebill/shared-common/dtos'
import { IAdminResourceModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class AdminResource extends BaseModel implements IAdminResourceModel {
  @Expose()
  @ApiProperty()
  adminId: string

  @Expose()
  @ApiProperty()
  resourceId: string
}

export class AdminResourceResponse extends OmitType(AdminResource, [`deletedAt`] as const) implements IAdminResourceResponse {}

export class AdminResourceListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [AdminResourceResponse] })
  @Type(() => AdminResourceResponse)
  data: AdminResourceResponse[]
}

export class AdminResourceCreate extends PickType(AdminResource, [`adminId`, `resourceId`] as const) implements IAdminResourceCreate {}

export class AdminResourceUpdate extends PartialType(AdminResourceCreate) implements IAdminResourceUpdate {}
