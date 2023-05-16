import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import { BaseModel } from '../common/base-model.dto'

import * as constants from 'src/constants'
import { IConsumerModel } from 'src/models'

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty()
  verified: boolean

  @Expose()
  @ApiProperty()
  password?: string

  @Expose()
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
}

export class ConsumerResponse extends Consumer {}
