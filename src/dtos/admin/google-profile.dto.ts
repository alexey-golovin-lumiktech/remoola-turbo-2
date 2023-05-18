import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { IGoogleProfileModel } from '../../models'
import { BaseModel, ListResponse } from '../common'

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
  @ApiProperty({ required: false, default: null })
  email?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  name?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  givenName?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  familyName?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  picture?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  organization?: string = null
}

export class GoogleProfileResponse extends OmitType(GoogleProfile, [`deletedAt`] as const) {}

export class GoogleProfilesList extends ListResponse<GoogleProfileResponse> {
  @Expose()
  @ApiProperty({ type: [GoogleProfileResponse] })
  @Type(() => GoogleProfileResponse)
  data: GoogleProfileResponse[]
}
