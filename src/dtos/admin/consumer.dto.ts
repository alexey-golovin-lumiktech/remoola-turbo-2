import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsBoolean, IsEmail, IsIn, ValidateIf } from 'class-validator'

import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { IConsumerModel } from '@wirebill/shared-common/models'
import { AccountTypeValue, ContractorKindValue } from '@wirebill/shared-common/types'

import * as constants from '../../constants'
import { BaseModel } from '../common'

export class Consumer extends BaseModel implements IConsumerModel {
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
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email: string

  @Expose()
  @ApiProperty({ default: false })
  @IsBoolean()
  verified = false

  @Expose()
  @ApiProperty({ default: false })
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
  howDidHearAboutUs: string

  @Expose()
  @ApiProperty()
  firstName: string

  @Expose()
  @ApiProperty()
  lastName: string

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

export class UpsertConsumer extends PickType(Consumer, [
  `email`, //
  `password`,
  `verified`,
  `firstName`,
  `lastName`,
  `accountType`,
  `contractorKind`,
]) {}
