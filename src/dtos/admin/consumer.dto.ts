import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator'

import { IConsumerCreate, IConsumerResponse, IConsumerUpdate } from '@wirebill/shared-common/dtos'
import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { IConsumerModel } from '@wirebill/shared-common/models'
import { AccountTypeValue, ContractorKindValue, HowDidHearAboutUsValue } from '@wirebill/shared-common/types'

import * as constants from '../../constants'
import { BaseModel } from '../common'

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty({ required: true })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  verified = false

  @Expose()
  @ApiProperty({ required: false, default: false })
  @ValidateIf(({ value }) => value != null)
  @IsBoolean()
  legalVerified = false

  @Expose()
  @ApiProperty({ required: false, default: null })
  password?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  salt?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  firstName?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  lastName?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  howDidHearAboutUs?: string | HowDidHearAboutUsValue = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(AccountType))
  accountType?: AccountTypeValue = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(ContractorKind))
  contractorKind?: ContractorKindValue = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeCustomerId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  googleProfileDetailsId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  personalDetailsId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  addressDetailsId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  organizationDetailsId?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  billingDetailsId?: string = null
}

export class ConsumerResponse extends OmitType(Consumer, [`deletedAt`] as const) implements IConsumerResponse {}

export class ConsumerListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [ConsumerResponse] })
  @Type(() => ConsumerResponse)
  data: ConsumerResponse[]
}

export class ConsumerCreate
  extends PickType(Consumer, [
    `email`,
    `verified`,
    `legalVerified`,
    `password`,
    `salt`,
    `firstName`,
    `lastName`,
    `howDidHearAboutUs`,
    `accountType`,
    `contractorKind`,
  ] as const)
  implements IConsumerCreate {}

export class ConsumerUpdate extends PartialType(ConsumerCreate) implements IConsumerUpdate {}
