import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsString, ValidateIf } from 'class-validator'
import { IGoogleProfileModel } from '../../models'
import { Expose } from 'class-transformer'

export class GoogleProfile implements IGoogleProfileModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsString()
  data: string

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
