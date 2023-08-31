import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn } from 'class-validator'

import { IOrganizationDetailsCreate, IOrganizationDetailsUpdate } from '@wirebill/shared-common/dtos'
import { OrganizationSize } from '@wirebill/shared-common/enums'
import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'
import { ConsumerRoleValue, OrganizationSizeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common/base-model.dto'

class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  name: string

  @Expose()
  @ApiProperty()
  @IsIn(Object.values(OrganizationSize))
  size: OrganizationSizeValue

  @Expose()
  @ApiProperty({ required: true })
  consumerRole: string | ConsumerRoleValue
}

export class OrganizationDetailsResponse extends OmitType(OrganizationDetails, [`deletedAt`] as const) {}

export class OrganizationDetailsCreate
  extends PickType(OrganizationDetails, [`name`, `size`, `consumerRole`] as const)
  implements IOrganizationDetailsCreate {}

export class OrganizationDetailsUpdate extends PartialType(OrganizationDetailsCreate) implements IOrganizationDetailsUpdate {}
