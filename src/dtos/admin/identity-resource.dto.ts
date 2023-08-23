import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IIdentityResourceCreate, IIdentityResourceResponse, IIdentityResourceUpdate } from '@wirebill/shared-common/dtos'
import { IIdentityResourceModel } from '@wirebill/shared-common/models'
import { ResourceAccessValue, ResourceOwnerTypeValue, ResourceRelatedToValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class IdentityResource extends BaseModel implements IIdentityResourceModel {
  @Expose()
  @ApiProperty()
  ownerId: string

  @Expose()
  @ApiProperty()
  ownerType: ResourceOwnerTypeValue

  @Expose()
  @ApiProperty()
  relatedTo: ResourceRelatedToValue

  @Expose()
  @ApiProperty()
  access: ResourceAccessValue

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

export class IdentityResourceResponse extends OmitType(IdentityResource, [`deletedAt`] as const) implements IIdentityResourceResponse {}

export class IdentityResourceListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [IdentityResourceResponse] })
  @Type(() => IdentityResourceResponse)
  data: IdentityResourceResponse[]
}

export class IdentityResourceCreate
  extends PickType(IdentityResource, [
    `ownerId`,
    `ownerType`,
    `relatedTo`,
    `access`,
    `originalname`,
    `mimetype`,
    `size`,
    `bucket`,
    `key`,
    `downloadUrl`,
  ] as const)
  implements IIdentityResourceCreate {}

export class IdentityResourceUpdate extends PartialType(IdentityResourceCreate) implements IIdentityResourceUpdate {}
