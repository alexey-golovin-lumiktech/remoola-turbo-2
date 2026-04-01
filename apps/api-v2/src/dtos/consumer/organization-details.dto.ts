import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type IOrganizationDetailsCreate,
  type IOrganizationDetailsModel,
  type IOrganizationDetailsUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class OrganizationDetailsDTO extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty({ description: `Organization or company name` })
  name: string;

  @Expose()
  @ApiProperty({ description: `Organization size category (e.g., SMALL, MEDIUM, LARGE, ENTERPRISE)` })
  @IsIn(Object.values($Enums.OrganizationSize))
  size: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty({ description: `User role within the organization (e.g., OWNER, ADMIN, MEMBER)`, required: true })
  consumerRole: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty({ description: `Custom role description if consumerRole is "Other"`, required: true })
  consumerRoleOther: null | string;
}

export class OrganizationDetailsResponse extends OmitType(OrganizationDetailsDTO, [`deletedAt`] as const) {}

export class OrganizationDetailsCreate
  extends PickType(OrganizationDetailsDTO, [`name`, `size`, `consumerRole`, `consumerRoleOther`] as const)
  implements IOrganizationDetailsCreate {}

export class OrganizationDetailsUpdate
  extends PartialType(OrganizationDetailsCreate)
  implements IOrganizationDetailsUpdate {}
