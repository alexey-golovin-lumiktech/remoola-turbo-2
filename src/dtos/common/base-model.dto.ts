import { ApiProperty } from '@nestjs/swagger'
import { Expose, Transform } from 'class-transformer'
import { IsDate, IsString, ValidateIf } from 'class-validator'
import moment from 'moment'

import { IBaseModel } from '../../common'

export class BaseModel implements IBaseModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsDate()
  @Transform(({ value: createdAt }) => moment(createdAt).valueOf())
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @Transform(({ value: createdAt }) => moment(createdAt).valueOf())
  updatedAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  @Transform(({ value: createdAt }) => createdAt == null || moment(createdAt).valueOf())
  @ValidateIf(({ value }) => value != null)
  deletedAt?: Date = null
}
