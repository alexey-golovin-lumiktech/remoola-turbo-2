import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsDate, ValidateIf } from 'class-validator'

import { IGoogleProfileModel } from '../../models'

export class GoogleProfile implements IGoogleProfileModel {
  @Exclude()
  data: string

  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  emailVerified: boolean

  @Expose()
  @ApiProperty({ default: null })
  email: string = null

  @Expose()
  @ApiProperty({ default: null })
  name: string = null

  @Expose()
  @ApiProperty({ default: null })
  givenName: string = null

  @Expose()
  @ApiProperty({ default: null })
  familyName: string = null

  @Expose()
  @ApiProperty({ default: null })
  picture: string = null

  @Expose()
  @ApiProperty({ default: null })
  organization: string = null

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @Expose()
  @ApiProperty({ default: null })
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  deletedAt: Date = null
}
