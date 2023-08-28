import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IResourceCreate, IResourceResponse, IResourceUpdate } from '@wirebill/shared-common/dtos'
import { IResourceModel } from '@wirebill/shared-common/models'
import { ResourceAccessValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class Resource extends BaseModel implements IResourceModel {
  @Expose()
  @ApiProperty()
  access?: ResourceAccessValue

  @Expose()
  @ApiProperty()
  originalname: string

  @Expose()
  @ApiProperty()
  mimetype: string

  @Expose()
  @ApiProperty()
  size: number

  @Expose()
  @ApiProperty()
  bucket: string

  @Expose()
  @ApiProperty()
  key: string

  @Expose()
  @ApiProperty()
  downloadUrl: string
}

export class ResourceResponse extends OmitType(Resource, [`deletedAt`] as const) implements IResourceResponse {}

export class ResourceListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [ResourceResponse] })
  @Type(() => ResourceResponse)
  data: ResourceResponse[]
}

export class ResourceCreate
  extends PickType(Resource, [`access`, `originalname`, `mimetype`, `size`, `bucket`, `key`, `downloadUrl`] as const)
  implements IResourceCreate {}

export class ResourceUpdate extends PartialType(ResourceCreate) implements IResourceUpdate {}
