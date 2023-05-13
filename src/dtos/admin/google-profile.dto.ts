import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiPropertyOptional({ default: null })
  email?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  name?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  givenName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  familyName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  picture?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  organization?: string

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @Expose()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date
}
