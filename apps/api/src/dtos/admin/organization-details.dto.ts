import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { $Enums } from '@remoola/database';

import { type IOrganizationDetailsModel, type IOrganizationDetailsUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  size: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty()
  consumerRole: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty()
  consumerRoleOther: null | string;
}

export class OrganizationDetailsResponse
  extends OmitType(OrganizationDetails, [`deletedAt`] as const)
  implements OrganizationDetailsResponse {}

export class OrganizationDetailsListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [OrganizationDetailsResponse] })
  @Type(() => OrganizationDetailsResponse)
  data: OrganizationDetailsResponse[];
}

export class OrganizationDetailsUpdate implements IOrganizationDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  name?: string;

  @Expose()
  @ApiProperty({ required: false })
  size?: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty({ required: false })
  consumerRole?: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty({ required: false })
  consumerRoleOther?: null | string;
}
