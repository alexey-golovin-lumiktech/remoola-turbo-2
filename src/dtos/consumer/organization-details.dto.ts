import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IOrganizationDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

export class OrganizationDetails extends BaseModel implements IOrganizationDetailsModel {
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
