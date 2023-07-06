import { ApiProperty } from '@nestjs/swagger'
import { Expose, Transform } from 'class-transformer'
import { IsDate, IsString, ValidateIf } from 'class-validator'
import moment from 'moment'

import { IBaseModel } from '@wirebill/shared-common'

export class BaseModel implements IBaseModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsDate()
  @Transform(({ value: createdAt }) => (createdAt == null ? null : moment(createdAt).valueOf()))
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @Transform(({ value: updatedAt }) => (updatedAt == null ? null : moment(updatedAt).valueOf()))
  updatedAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  @Transform(({ value: deletedAt }) => (deletedAt == null ? null : moment(deletedAt).valueOf()))
  deletedAt?: Date = null
}
