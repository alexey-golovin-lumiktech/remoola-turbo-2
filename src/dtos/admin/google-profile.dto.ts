import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsString } from 'class-validator'
import { IGoogleProfileModel } from 'src/models'

export class GoogleProfile implements IGoogleProfileModel {
  @ApiProperty()
  @IsString()
  id: string

  @ApiProperty()
  @IsString()
  data: string

  @ApiProperty()
  @IsDate()
  createdAt: Date

  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @ApiProperty()
  @IsDate()
  deletedAt: Date
}
