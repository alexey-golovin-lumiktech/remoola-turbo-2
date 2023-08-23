import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator'

import { IConsumerResponse } from '@wirebill/shared-common/dtos'
import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { IConsumerModel } from '@wirebill/shared-common/models'
import { AccountTypeValue, ContractorKindValue, HowDidHearAboutUsValue } from '@wirebill/shared-common/types'

import * as constants from '../../constants'
import { BaseModel } from '../common'

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(AccountType))
  accountType?: AccountTypeValue

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(ContractorKind))
  contractorKind?: ContractorKindValue

  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty()
  @IsBoolean()
  verified = false

  @Expose()
  @ApiProperty()
  @IsBoolean()
  legalVerified = false

  @Expose()
  @ApiProperty()
  password: string

  @Expose()
  @ApiProperty()
  salt: string

  @Expose()
  @ApiProperty({ required: true })
  howDidHearAboutUs: string | HowDidHearAboutUsValue

  @Expose()
  @ApiProperty()
  firstName: string

  @Expose()
  @ApiProperty()
  lastName: string

  @Expose()
  @ApiProperty({ required: false })
  stripeCustomerId?: string

  // refs
  @Expose()
  @ApiProperty({ required: false })
  googleProfileDetailsId?: string

  @Expose()
  @ApiProperty({ required: false })
  personalDetailsId?: string

  @Expose()
  @ApiProperty({ required: false })
  addressDetailsId?: string

  @Expose()
  @ApiProperty({ required: false })
  organizationDetailsId?: string
}

export class ConsumerResponse extends Consumer implements IConsumerResponse {}

export class ConsumerListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [ConsumerResponse] })
  @Type(() => ConsumerResponse)
  data: ConsumerResponse[]
}

export class UpsertConsumer extends PickType(Consumer, [
  `email`, //
  `password`,
  `verified`,
  `firstName`,
  `lastName`,
  `accountType`,
  `contractorKind`,
]) {}
