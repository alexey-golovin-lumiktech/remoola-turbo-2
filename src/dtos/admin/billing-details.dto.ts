import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IBillingDetailsModel, IBillingDetailsUpdate } from '@wirebill/shared-common'

import { BaseModel } from '../common'

class BillingDetails extends BaseModel implements IBillingDetailsModel {
  @Expose()
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty({ required: false })
  email?: string

  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  phone?: string

  @Expose()
  @ApiProperty({ required: false })
  city?: string

  @Expose()
  @ApiProperty({ required: false })
  country?: string

  @Expose()
  @ApiProperty({ required: false })
  line1?: string

  @Expose()
  @ApiProperty({ required: false })
  line2?: string

  @Expose()
  @ApiProperty({ required: false })
  postalCode?: string

  @Expose()
  @ApiProperty({ required: false })
  state?: string
}

export class BillingDetailsResponse extends OmitType(BillingDetails, [`deletedAt`] as const) {}

export class UpdateBillingDetails implements IBillingDetailsUpdate {
  @Expose()
  @ApiProperty({ required: false })
  email?: string

  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  phone?: string

  @Expose()
  @ApiProperty({ required: false })
  city?: string

  @Expose()
  @ApiProperty({ required: false })
  country?: string

  @Expose()
  @ApiProperty({ required: false })
  line1?: string

  @Expose()
  @ApiProperty({ required: false })
  line2?: string

  @Expose()
  @ApiProperty({ required: false })
  postalCode?: string

  @Expose()
  @ApiProperty({ required: false })
  state?: string
}
