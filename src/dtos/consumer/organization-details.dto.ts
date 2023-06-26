import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IOrganizationDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  name: string

  @Expose()
  @ApiProperty()
  size: string

  @Expose()
  @ApiProperty()
  consumerRoleInOrganization: string
}

export class OrganizationDetailsResponse extends OmitType(OrganizationDetails, [`deletedAt`] as const) {}

export class CreateOrganizationDetails extends PickType(OrganizationDetailsResponse, [
  `consumerId`,
  `name`,
  `size`,
  `consumerRoleInOrganization`,
] as const) {}

export class UpdateOrganizationDetails extends PickType(OrganizationDetailsResponse, [
  `consumerId`,
  `name`,
  `size`,
  `consumerRoleInOrganization`,
] as const) {}
