import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { $Enums } from '@remoola/database-2';

import {
  type IResourceCreate,
  type IResourceModel,
  type IResourceResponse,
  type IResourceUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class Resource extends BaseModel implements IResourceModel {
  @Expose()
  @ApiProperty({ description: `Resource access level (PUBLIC, PRIVATE, AUTHENTICATED)` })
  access?: $Enums.ResourceAccess;

  @Expose()
  @ApiProperty({ description: `Original filename as uploaded by the user` })
  originalName: string;

  @Expose()
  @ApiProperty({ description: `MIME type of the file (e.g., "application/pdf", "image/png")` })
  mimetype: string;

  @Expose()
  @ApiProperty({ description: `File size in bytes` })
  size: number;

  @Expose()
  @ApiProperty({ description: `Storage bucket name where the file is stored` })
  bucket: string;

  @Expose()
  @ApiProperty({ description: `Storage key (path) for the file in the bucket` })
  key: string;

  @Expose()
  @ApiProperty({ description: `Pre-signed download URL for accessing the file` })
  downloadUrl: string;
}

export class ResourceResponse extends OmitType(Resource, [`deletedAt`] as const) implements IResourceResponse {}

export class ResourceListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of resources in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of resource records`, required: true, type: [ResourceResponse] })
  @Type(() => ResourceResponse)
  data: ResourceResponse[];
}

export class ResourceCreate
  extends PickType(Resource, [`access`, `originalName`, `mimetype`, `size`, `bucket`, `key`, `downloadUrl`] as const)
  implements IResourceCreate {}

export class ResourceUpdate extends PartialType(ResourceCreate) implements IResourceUpdate {}
