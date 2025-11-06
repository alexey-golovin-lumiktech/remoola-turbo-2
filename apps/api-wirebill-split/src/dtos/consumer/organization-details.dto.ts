import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn } from 'class-validator';

import { OrganizationSize } from '@remoola/database';

import {
  type ConsumerRoleValue,
  type IOrganizationDetailsCreate,
  type IOrganizationDetailsModel,
  type IOrganizationDetailsUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  @IsIn(Object.values(OrganizationSize))
  size: OrganizationSize;

  @Expose()
  @ApiProperty({ required: true })
  consumerRole: string | ConsumerRoleValue;
}

export class OrganizationDetailsResponse extends OmitType(OrganizationDetails, [`deletedAt`] as const) {}

export class OrganizationDetailsCreate
  extends PickType(OrganizationDetails, [`name`, `size`, `consumerRole`] as const)
  implements IOrganizationDetailsCreate {}

export class OrganizationDetailsUpdate
  extends PartialType(OrganizationDetailsCreate)
  implements IOrganizationDetailsUpdate {}
