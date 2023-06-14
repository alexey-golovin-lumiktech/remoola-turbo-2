import { ApiProperty, PickType } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import { IConsumerModel } from '../../models'
import { AccountType, accountTypeVariants, ContractorKind, contractorKindVariants } from '../../shared-types'
import { BaseModel, ListResponse } from '../common'

export class Consumer extends BaseModel implements IConsumerModel {
  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  verified: boolean

  @Exclude()
  @ApiProperty()
  password?: string

  @Exclude()
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
  @ApiProperty({ enum: contractorKindVariants, default: null, required: false })
  contractorKind?: ContractorKind = null

  @Expose()
  @ApiProperty()
  stripeCustomerId?: string

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

export class ConsumersList extends ListResponse<Consumer> {
  @Expose()
  @ApiProperty({ type: [Consumer] })
  @Type(() => Consumer)
  data: Consumer[]
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
