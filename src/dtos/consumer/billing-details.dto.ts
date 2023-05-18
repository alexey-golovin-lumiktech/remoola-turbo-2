import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import { BaseModel } from '../common/base-model.dto'

import * as constants from 'src/constants'
import { IBaseModel, IBillingDetailsModel } from 'src/models'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

class BillingDetails extends BaseModel implements IBillingDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty({ required: false, default: null })
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  email?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  name?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  phone?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  city?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  country?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  line1?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  line2?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  postalCode?: string = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  state?: string = null
}

export class BillingDetailsResponse extends OmitType(BillingDetails, [`createdAt`, `updatedAt`, `deletedAt`] as const) {}

export class UpsertBillingDetails extends OmitType(BillingDetails, [`id`, `createdAt`, `updatedAt`, `deletedAt`] as const) {
  @Expose()
  @ApiProperty()
  consumerId: string
}
