import { ApiProperty, PickType } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import { BaseModel, ListResponse } from '../common'

import { IConsumerModel } from 'src/models'

export class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  verified: boolean

  @Exclude()
  @ApiProperty({ required: false, default: null })
  password?: string

  @Exclude()
  @ApiProperty({ required: false, default: null })
  salt?: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  firstName?: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  lastName?: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  middleName?: string
}

export class ConsumersList extends ListResponse<Consumer> {
  @Expose()
  @ApiProperty({ type: [Consumer] })
  @Type(() => Consumer)
  data: Consumer[]
}

export class UpsertConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
