import { ApiProperty, PickType } from '@nestjs/swagger'
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
  @ApiProperty({ default: null })
  password: string = null

  @Exclude()
  @ApiProperty({ default: null })
  salt: string = null

  @Expose()
  @ApiProperty({ default: null })
  firstName: string = null

  @Expose()
  @ApiProperty({ default: null })
  lastName: string = null

  @Expose()
  @ApiProperty({ default: null })
  middleName: string = null

  @Expose()
  @ApiProperty({ default: null })
  @ValidateIf(({ value }) => value != null)
  deletedAt: Date = null

  @Expose()
  @ApiProperty({ default: null })
  googleProfileId: string = null

  @Expose()
  @ApiProperty({ default: null })
  billingDetailsId: string = null

  @Expose()
  @ApiProperty({ default: null })
  addressId: string = null
}

export class CreateConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
export class UpdateConsumer extends CreateConsumer {}
export class UpdatePassword extends PickType(Consumer, [`password`] as const) {}
