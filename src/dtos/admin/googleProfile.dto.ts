import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsBoolean, IsDate, IsString, ValidateIf } from 'class-validator'

import { IGoogleProfileModel } from '../../models'

export class GoogleProfile implements IGoogleProfileModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsString()
  consumersId: string

  @Expose()
  @ApiProperty()
  @IsString()
  email: string

  @Expose()
  @ApiProperty()
  @IsBoolean()
  emailVerified: boolean

  @Expose()
  @ApiProperty()
  @IsString()
  name: string

  @Expose()
  @ApiProperty()
  @IsString()
  givenName: string

  @Expose()
  @ApiProperty()
  @IsString()
  familyName: string

  @Expose()
  @ApiProperty()
  @IsString()
  picture: string

  @Expose()
  @ApiProperty()
  @IsString()
  organization: string

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  deletedAt?: Date = null
}
