import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IGoogleProfileDetailsCreate, IGoogleProfileDetailsResponse, IGoogleProfileDetailsUpdate } from '@wirebill/shared-common/dtos'
import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class GoogleProfileDetails extends BaseModel implements IGoogleProfileDetailsModel {
  @Expose()
  @ApiProperty({ required: true })
  consumerId: string

  @Expose()
  @ApiProperty({ required: true })
  emailVerified: boolean

  @Expose()
  @ApiProperty({ required: true })
  email: string

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

  @Expose()
  @ApiProperty({ required: false })
  metadata?: string
}

export class GoogleProfileDetailsResponse
  extends OmitType(GoogleProfileDetails, [`deletedAt`, `metadata`] as const)
  implements IGoogleProfileDetailsResponse {}

export class GoogleProfileDetailsListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [GoogleProfileDetailsResponse] })
  @Type(() => GoogleProfileDetailsResponse)
  data: GoogleProfileDetailsResponse[]
}

export class GoogleProfileDetailsCreate
  extends PickType(GoogleProfileDetails, [
    `name`, //
    `emailVerified`,
    `email`,
    `givenName`,
    `familyName`,
    `picture`,
    `organization`,
  ] as const)
  implements IGoogleProfileDetailsCreate {}

export class GoogleProfileDetailsUpdate extends PartialType(GoogleProfileDetailsCreate) implements IGoogleProfileDetailsUpdate {}
