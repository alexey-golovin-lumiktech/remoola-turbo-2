import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IBaseModel } from 'src/models'

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
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date = null
}
