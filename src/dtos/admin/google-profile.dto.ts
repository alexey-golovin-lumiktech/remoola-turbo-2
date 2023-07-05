import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IGoogleProfileModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class GoogleProfile extends BaseModel implements IGoogleProfileModel {
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

export class GoogleProfileResponse extends OmitType(GoogleProfile, [`deletedAt`] as const) {}
