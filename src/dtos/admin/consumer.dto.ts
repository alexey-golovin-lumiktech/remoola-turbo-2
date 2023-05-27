import { ApiProperty, PickType } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import { IConsumerModel } from '../../models'
import { BaseModel, ListResponse } from '../common'

export class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  verified: boolean

  @Exclude()
  @ApiProperty()
  password?: string

  @Exclude()
  @ApiProperty()
  salt?: string

  @Expose()
  @ApiProperty()
  firstName?: string

  @Expose()
  @ApiProperty()
  lastName?: string

  @Expose()
  @ApiProperty()
  middleName?: string

  @Expose()
  @ApiProperty()
  stripeCustomerId?: string
}

export class ConsumersList extends ListResponse<Consumer> {
  @Expose()
  @ApiProperty({ type: [Consumer] })
  @Type(() => Consumer)
  data: Consumer[]
}

export class UpsertConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
