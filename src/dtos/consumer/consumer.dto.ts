import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from '../../constants'
import { IConsumerModel } from '../../models'
import { AccountType, accountTypeVariants, ContractorKind, contractorKindVariants } from '../../shared-types'
import { BaseModel } from '../common/base-model.dto'

class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
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
  @ApiProperty({ enum: accountTypeVariants })
  accountType: AccountType

  @Expose()
  @ApiProperty({ enum: contractorKindVariants })
  contractorKind?: ContractorKind

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

export class ConsumerResponse extends Consumer {}
