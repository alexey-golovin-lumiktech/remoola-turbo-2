import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import { IBaseModel } from '../../common'
import * as constants from '../../constants'
import { IBillingDetailsModel } from '../../models'
import { BaseModel } from '../common/base-model.dto'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

class BillingDetails extends BaseModel implements IBillingDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  email?: string

  @Expose()
  @ApiProperty()
  name?: string

  @Expose()
  @ApiProperty()
  phone?: string

  @Expose()
  @ApiProperty()
  city?: string

  @Expose()
  @ApiProperty()
  country?: string

  @Expose()
  @ApiProperty()
  line1?: string

  @Expose()
  @ApiProperty()
  line2?: string

  @Expose()
  @ApiProperty()
  postalCode?: string

  @Expose()
  @ApiProperty()
  state?: string
}

export class BillingDetailsResponse extends OmitType(BillingDetails, [`createdAt`, `updatedAt`, `deletedAt`] as const) {}

export class UpsertBillingDetails extends OmitType(BillingDetails, [`id`, `createdAt`, `updatedAt`, `deletedAt`] as const) {
  @Expose()
  @ApiProperty()
  consumerId: string
}
