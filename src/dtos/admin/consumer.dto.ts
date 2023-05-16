import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { ValidateIf } from 'class-validator'

import { IConsumerModel } from 'src/models'

export class Consumer implements IConsumerModel {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  verified: boolean

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date

  @Exclude()
  @ApiPropertyOptional({ default: null })
  password?: string

  @Exclude()
  @ApiPropertyOptional({ default: null })
  salt?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  firstName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  lastName?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  middleName?: string

  @Expose()
  @ValidateIf(({ value }) => value != null)
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date
}

export class UpsertConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
