import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsBoolean, IsDate, IsString, ValidateIf } from 'class-validator'

import { IConsumerModel } from '../../models'

export class Consumer implements IConsumerModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsString()
  email: string

  @Expose()
  @ApiProperty()
  @IsBoolean()
  verified: boolean

  @Expose()
  @ApiProperty()
  @IsString()
  password: string

  @Exclude()
  @IsString()
  salt: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  googleProfileId?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  firstName?: string = null

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  lastName?: string = null

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  middleName?: string = null

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @Expose()
  @ApiPropertyOptional()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  deletedAt?: Date = null
}

export class CreateConsumer extends PickType(Consumer, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
export class UpdateConsumer extends CreateConsumer {}
export class UpdatePassword extends PickType(Consumer, [`password`] as const) {}
