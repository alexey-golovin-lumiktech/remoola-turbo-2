import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail, IsIn, ValidateIf } from 'class-validator'

import type { AccountTypeValue, ContractorKindValue } from '@wirebill/shared-common/common.types'
import { AccountType, ContractorKind } from '@wirebill/shared-common/enum-like'

import * as constants from '../../constants'
import { IConsumerModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty({ enum: Object.values(AccountType) })
  accountType: AccountTypeValue

  @Expose()
  @ApiProperty({ required: false, default: null })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(ContractorKind))
  contractorKind?: ContractorKindValue = null

  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ default: false })
  verified = false

  @Expose()
  @ApiProperty({ default: false })
  legalVerified = false

  @Expose()
  @ApiProperty({ default: null, required: false })
  password?: string = null

  @Expose()
  @ApiProperty({ default: null, required: false })
  salt?: string = null

  @Expose()
  @ApiProperty({ required: true })
  howDidHearAboutUs: string

  @Expose()
  @ApiProperty()
  firstName?: string

  @Expose()
  @ApiProperty()
  lastName?: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  stripeCustomerId?: string = null

  // refs
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
}

export class ConsumerResponse extends OmitType(Consumer, [`deletedAt`] as const) {}
