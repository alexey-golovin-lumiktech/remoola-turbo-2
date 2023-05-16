import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IGoogleProfileModel } from 'src/models'

class GoogleProfile implements IGoogleProfileModel {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date

  @Expose()
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date = null

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
  @ApiPropertyOptional({ default: null })
  email?: string = null

  @Expose()
  @ApiPropertyOptional({ default: null })
  name?: string = null

  @Expose()
  @ApiPropertyOptional({ default: null })
  givenName?: string = null

  @Expose()
  @ApiPropertyOptional({ default: null })
  familyName?: string = null

  @Expose()
  @ApiPropertyOptional({ default: null })
  picture?: string = null

  @Expose()
  @ApiPropertyOptional({ default: null })
  organization?: string = null
}

export class GoogleProfileResponse extends OmitType(GoogleProfile, [`deletedAt`] as const) {}
