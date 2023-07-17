import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IGoogleProfileDetailsUpdate } from '@wirebill/shared-common/dtos'
import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class GoogleProfileDetails extends BaseModel implements IGoogleProfileDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  emailVerified: boolean

  @Expose()
  @ApiProperty()
  data: string

  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  name?: string

  @Expose()
  @ApiProperty()
  givenName?: string

  @Expose()
  @ApiProperty()
  familyName?: string

  @Expose()
  @ApiProperty()
  picture?: string

  @Expose()
  @ApiProperty()
  organization?: string
}

export class GoogleProfileDetailsResponse extends OmitType(GoogleProfileDetails, [`deletedAt`] as const) {}

export class UpdateGoogleProfileDetails implements IGoogleProfileDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  emailVerified?: boolean

  @Expose()
  @ApiProperty({ required: false })
  data?: string

  @Expose()
  @ApiProperty({ required: false })
  email?: string

  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  givenName?: string

  @Expose()
  @ApiProperty({ required: false })
  familyName?: string

  @Expose()
  @ApiProperty({ required: false })
  picture?: string

  @Expose()
  @ApiProperty({ required: false })
  organization?: string
}
