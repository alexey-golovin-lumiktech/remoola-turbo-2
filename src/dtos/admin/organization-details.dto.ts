import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IOrganizationDetailsModel, IOrganizationDetailsUpdate, OrganizationSizeValue } from '@wirebill/shared-common'

import { BaseModel } from '../common'

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  name: string

  @Expose()
  @ApiProperty()
  size: OrganizationSizeValue

  @Expose()
  @ApiProperty()
  consumerRole: string
}

export class OrganizationDetailsResponse extends OmitType(OrganizationDetails, [`deletedAt`] as const) {}

export class UpdateOrganizationDetails implements IOrganizationDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  size?: OrganizationSizeValue

  @Expose()
  @ApiProperty({ required: false })
  consumerRole?: string
}
