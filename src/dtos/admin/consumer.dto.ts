import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { ValidateIf } from 'class-validator'

import { IConsumerModel } from '../../models'

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

  @Expose()
  @ApiPropertyOptional({ default: null })
  googleProfileId?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  billingDetailsId?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  addressId?: string
}

export class CreateConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
export class UpdateConsumer extends CreateConsumer {}
export class UpdatePassword extends PickType(Consumer, [`password`] as const) {}
