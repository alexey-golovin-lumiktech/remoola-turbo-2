import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IOrganizationDetailsUpdate } from '@wirebill/shared-common/dtos'
import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'
import { ConsumerRoleValue, OrganizationSizeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  name: string

  @Expose()
  @ApiProperty()
  size: OrganizationSizeValue

  @Expose()
  @ApiProperty()
  consumerRole: string | ConsumerRoleValue
}

export class OrganizationDetailsResponse
  extends OmitType(OrganizationDetails, [`deletedAt`] as const)
  implements OrganizationDetailsResponse {}

export class OrganizationDetailsListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [OrganizationDetailsResponse] })
  @Type(() => OrganizationDetailsResponse)
  data: OrganizationDetailsResponse[]
}

export class OrganizationDetailsUpdate implements IOrganizationDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  size?: OrganizationSizeValue

  @Expose()
  @ApiProperty({ required: false })
  consumerRole?: string | ConsumerRoleValue
}
