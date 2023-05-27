import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IBaseModel } from '../../models'

export class BaseModel implements IBaseModel {
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
  @ApiProperty()
  deletedAt?: Date = null
}
