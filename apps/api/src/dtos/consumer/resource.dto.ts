import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { $Enums } from '@remoola/database';

import {
  type IResourceCreate,
  type IResourceModel,
  type IResourceResponse,
  type IResourceUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class Resource extends BaseModel implements IResourceModel {
  @Expose()
  @ApiProperty()
  access?: $Enums.ResourceAccess;

  @Expose()
  @ApiProperty()
  originalname: string;

  @Expose()
  @ApiProperty()
  mimetype: string;

  @Expose()
  @ApiProperty()
  size: number;

  @Expose()
  @ApiProperty()
  bucket: string;

  @Expose()
  @ApiProperty()
  key: string;

  @Expose()
  @ApiProperty()
  downloadUrl: string;
}

export class ResourceResponse extends OmitType(Resource, [`deletedAt`] as const) implements IResourceResponse {}

export class ResourceListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [ResourceResponse] })
  @Type(() => ResourceResponse)
  data: ResourceResponse[];
}

export class ResourceCreate
  extends PickType(Resource, [`access`, `originalname`, `mimetype`, `size`, `bucket`, `key`, `downloadUrl`] as const)
  implements IResourceCreate {}

export class ResourceUpdate extends PartialType(ResourceCreate) implements IResourceUpdate {}
