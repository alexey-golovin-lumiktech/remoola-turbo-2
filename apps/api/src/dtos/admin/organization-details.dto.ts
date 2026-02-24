import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { $Enums } from '@remoola/database-2';

import { type IOrganizationDetailsModel, type IOrganizationDetailsUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty({ description: `Organization or company name` })
  name: string;

  @Expose()
  @ApiProperty({ description: `Organization size category (e.g., SMALL, MEDIUM, LARGE, ENTERPRISE)` })
  size: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty({ description: `User role within the organization (e.g., OWNER, ADMIN, MEMBER)` })
  consumerRole: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty({ description: `Custom role description if consumerRole is "Other"` })
  consumerRoleOther: null | string;
}

export class OrganizationDetailsResponse
  extends OmitType(OrganizationDetails, [`deletedAt`] as const)
  implements OrganizationDetailsResponse {}

export class OrganizationDetailsListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of organization details in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({
    description: `Array of organization detail records`,
    required: true,
    type: [OrganizationDetailsResponse],
  })
  @Type(() => OrganizationDetailsResponse)
  data: OrganizationDetailsResponse[];
}

export class OrganizationDetailsUpdate implements IOrganizationDetailsUpdate {
  @Expose()
  @ApiProperty({ description: `Organization or company name`, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ description: `Organization size category`, required: false })
  size?: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty({ description: `User role within the organization`, required: false })
  consumerRole?: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty({ description: `Custom role description if consumerRole is "Other"`, required: false })
  consumerRoleOther?: null | string;
}
